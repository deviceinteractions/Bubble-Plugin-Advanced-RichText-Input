// --- Table of Contents
// Note: POTENTIALLY BROKEN can mean legitimately broken or misleading
//  -- instance.data - d variables
//   - FORMAT: NAME - FREQ - DESCRIPTION
//   - did_set_content_first_time - 6 - POTENTIALLY BROKEN tracks if this is the first call to the update function. Uncertain about it's accuracy
//   - has_resize_listener - 3 - POTENTIALLY BROKEN - is turned on to be turned right back off. It may be good to remove this part of the condition
//   - initial_height - 2 - POTENTIALLY BROKEN Used to calculate height of the RTE. Sent as parameter to function where it could instead just be used as a state variable
//   - pasted - 2 - boolean indicating if something was pasted. Set true via an event handler in initialize.js.
//   - elements - 11 - holds the HTML elements that are modified as part of RTE
//   - should_rerun_val - 5 - boolean flag indicating that a value changed and several functions should be re-run.
//   - current_bbcode - 2 - holds the current value in the editor in bbcode. Used to check if a change is new in a limited scope.
//   - quill - 9 - access to the quill API
//   - last_change_source - 6 - determines if the last change source was from a user or API
//   - has_been_edited - 4 - determines if data was edited and that the edit was user-performed
//   - prev_contents - 4 - tracks the previous content of the bbcode
//   - typing_timer_id - 3 - timeout handler. part of the object so it can be cleared anywhere. Attached event autosaves after DONE_TYPING_INTERVAL_MS ms (currently 2200)
//   - img_tracker - 2 - keeps track of the number of inline images to know when to update them
//   - prev_theme - 3 - used to track if the theme changed
//   - prev_complexity - 3 - used to track if the complexity changed
//   - has_been_reconciled - 3 - tracks if the reconcile function has ran
//
//  -- properties variables
//   - autobinding - 2 - POTENTIALLY BROKEN value of autobound field. It seems to be used as a boolean in some cases, which may result in weird JS logic
//   - autosave - 1 - determines if autosave is checked in the editor
//   - theme - 7 - theme the editor is set to. Either Regular or Tooltip
//   - empty_is_invalid - 1 - determines if it is valid for the editor to be empty
//   - initial_content - not sure if I should do anything about this once
//   - complexity - 6 determines the amount of controls displayed to the user
//   - placeholder - 3 - value that appears if nothing else is defined
//   - bubble - 4 - access to bubble and html element information
//     - bubble.border_style() - 1 - returns string of border style
//     - bubble.height() - 1 - returns a number
//     - bubble.auto_binding() - 2 - POTENTIALLY BROKEN returns boolean. true if autobinding on, else false. I'm not certain this exists. It's not documented
//   - overflow - boolean if overflow is enabled
//   - link_placeholder - 1 - placeholder value for a link in the RTE
//   - disabled - 1- sets quill to disabled if the element is disabled

const update = function(instance, properties, context) {
  // shorthand for d container
  const d = instance.data
  d.allowTextInsertion = properties.allow_text_insertions;
  // `d.initialized` tracks the initialization of the quill editor,
  // while first pass looks only at the content.
  // It is possible to initialize the editor after a first pass, with an "updated" content,
  // for example when we change the theme of the editor. We reinitialize it,
  // but it's not the first pass, and we need to control the source of the text content.
  d.did_set_content_first_time = true // Track first content loading after update

  // Avoid adding element selectors, store direct references in d.elements
  if (!('elements' in d)) d.elements = {}
  // track that this instance is autobound, to bypass the reset function
  if (!('is_autobound' in d)) d.is_autobound = !!properties.bubble.auto_binding()
  // Keep track of the whatever initial height the bubble element had to restore it
  if (!('initial_height' in d)) d.initial_height = properties.bubble.height()

  // shorthands for the ALL_FONTS constant, easier readability
  const {
    DONE_TYPING_INTERVAL_MS,
    SUPPORTED_FILE_EXTENSIONS,
    BOTTOM_TEXT_MARGIN,
    ICON_H1,
    ICON_H2,
    ICON_H3,
    ICON_H4,
    ALL_FONTS,
    HTML_TO_BBCODE_FONTS,
    BBCODE_TO_HTML_FONTS
  } = d.consts

  // 4 objects track the current diff, and track a global up-to-date version of the properties object
  // d.last_update_props is an up-to-date copy of `properties` (to work around closure problems with setTimeouts)
  // d.updated_props tracks the changed `properties`
  // d.last_update_bubble_props & d.updated_bubble_props respectively track the same but for `properties.bubble`

  if (!d.last_update_bubble_props) d.last_update_bubble_props = {}
  d.updated_bubble_props = {}
  for (const key in properties.bubble) {
    const property = properties.bubble[key]()
    if (d.last_update_bubble_props[key] !== property) {
      d.last_update_bubble_props[key] = property
      d.updated_bubble_props[key] = property
    }
  }
  if (!d.last_update_props) d.last_update_props = {}
  d.updated_props = {}
  for (const key in properties) {
    if (key === 'bubble') continue
    const there_has_been_changes = properties[key] !== d.last_update_props[key]
    if (there_has_been_changes) {
      d.updated_props[key] = properties[key]
      d.last_update_props[key] = properties[key]
    }
  }

  if (!d.has_been_reconciled){
    // The instance hasn't been reconciled yet, and we risk losing what was updated, so we refill the data.
    // Why we do this? Because the instance can update again before it is reconciled, and in that case updated_props is empty
    // since the properties were copied at the previous update run. But the editor wasn't ready to be displayed then, so the next time update runs,
    // we lose all the information about what had been updated.
    for (const key in properties) {
      if (key === 'bubble') continue
      d.updated_props[key] = properties[key]
      d.last_update_props[key] = properties[key]
    }

    for (const key in properties.bubble) {
      const property = properties.bubble[key]()
      d.last_update_bubble_props[key] = property
      d.updated_bubble_props[key] = property
    }
  }

  // Get rid of a lot of odd issues with extra updates running by returning on identical updates
  if (
    Object.keys(d.updated_props).length === 0 &&
    Object.keys(d.updated_bubble_props).length === 0
  ) return

  if (!d.wait_for_visible_timeouts) d.wait_for_visible_timeouts = {}
  // @TODO replace with MutationObserver on the parentage for much better performance...
  const wait_for_visible = (cb, is_inner = false) => {
    // tricky situation, because update doesn't fire when this becomes visible,
    // so set_height is unreliable
    if (d.elements.rteContainer && d.elements.rteContainer.is(':visible')) {
      delete d.wait_for_visible_timeouts[cb]
      return cb()
    } else if (!d.wait_for_visible_timeouts[cb] || is_inner) {
      d.wait_for_visible_timeouts[cb] = setTimeout(() => {
        return wait_for_visible(cb, true)
      }, 100)
    }
  }

  // === event handler and helper functions ===

  // function to check if the input is truly empty - runs under the assumption that an input should be considered empty
  // if it contains a blank html tag but no text is actually written
  const checkForContent = (html) => {
    html = html.replace(/<(.*?)>(.*?)<\/(.*?)>/gmi, "$2")
    html = html.replace(/<br>/gi, "")
    return html
  }

  const attr = (node, attribute) =>
    node.attributes && node.attributes[attribute] && node.attributes[attribute].nodeValue || ''

  const quillAttrs = (node) =>
    [...(node.classList || [])].reduce((attributes, className) => {
      const [prefix, attribute, value] = className.split('-')
      if (prefix === 'ql') {
        attributes[attribute] = value || true
      }
      return attributes
    }, {})

  const bbcodeTagMap = {
    'IMG': (node) => {
      const width = attr(node, 'width')
      const src = attr(node, 'src')
      return [`[img${width ? ` width=${width}` : ''}]${src}[/img]`, '']
    },
    'IFRAME': (node) => {
      const src = attr(node, 'src')
      const youtubeMatch = src.match(/https:\/\/www.youtube.com\/embed\/(.*?)\?showinfo=0(.*?)/)
      if (youtubeMatch) {
        return [`[youtube]${youtubeMatch[1]}[/youtube]`, '']
      }
      if (quillAttrs(node).video) {
        return [`[video]${src}[/video]`, '']
      }
      return ['', '']
    },
    'UL': () => ['[ml][ul]', '[/ul][/ml]'],
    'OL': () => ['[ml][ol]', '[/ol][/ml]'],
    'LI': (node, listType) => {
      const prevSib = node.previousElementSibling
      const nextSib = node.nextElementSibling

      const classData = [node, prevSib, nextSib].map((curr) => {
        const attrs = curr ? quillAttrs(curr) : {}
        return {
          indent: attrs.indent ? parseInt(attrs.indent, 10) : 0,
          align: attrs.align || 'left',
        }
      })

      const openDiff = classData[0].indent - classData[1].indent
      const closeDiff = classData[0].indent - classData[2].indent

      let openList = ''
      for (let i = 0; i < openDiff; i++) {
        const data = ` data=${classData[0].indent}`
        if (listType === 'UL') {
          openList += `[ul${data}]`
        } else if (listType === 'OL') {
          openList += `[ol${data}]`
        }
      }

      let closeList = ''
      for (let i = 0; i < closeDiff; i++) {
        if (listType === 'UL') {
          closeList += `[/ul]`
        } else if (listType === 'OL') {
          closeList += `[/ol]`
        }
      }

      const indent = ` indent=${classData[0].indent}`
      const align = ` align=${classData[0].align}`

      return [`${openList}[li${indent}${align}]`, `[/li]${closeList}`]
    },
    'H1': () => ['[h1]', '[/h1]\n'],
    'H2': () => ['[h2]', '[/h2]\n'],
    'H3': () => ['[h3]', '[/h3]\n'],
    'H4': () => ['[h4]', '[/h4]\n'],
    'SUB': () => ['[sub]', '[/sub]'],
    'SUP': () => ['[sup]', '[/sup]'],
    'PRE': () => ['[code]', '[/code]'],
    'BLOCKQUOTE': () => ['[quote]', '[/quote]'],
    'U': () => ['[u]', '[/u]'],
    'EM': () => ['[i]', '[/i]'],
    'STRONG': () => ['[b]', '[/b]'],
    'S': () => ['[s]', '[/s]'],
    'P': () => ['', '\n'],
    'SPAN': () => ['', ''],
    'BR': () => ['', ''],
  }

  const bbcodeSizeMap = {
    'small': 1,
    'large': 4,
    'huge': 6,
  }

  const getBBCode = (node, listType) => {
    if (node.nodeName === '#text') {
      return node.nodeValue
    }

    // Initialize empty components of BBCode result
    let bbcodeInner = ''
    let bbcodeOuterLeft = ''
    let bbcodeOuterRight = ''

    // Recursively append BBCode from child nodes
    if (node.childNodes.length) {
      node.childNodes.forEach((child) => {
        bbcodeInner += getBBCode(
          child,
          ['UL', 'OL'].includes(node.nodeName) && node.nodeName
        )
      })
    }

    // A should be the most inner element
    if (node.nodeName === 'A') {
      let url = attr(node, 'href')
      if (!url.includes('http://') && !url.includes("https://") && !url.includes("mailto:")) {
        url = `https://${url}`
      }
      bbcodeInner = `[url=${url}]${bbcodeInner}[/url]`
    }

    // Convert HTML element styles
    if (node.style && node.style.length) {
      if (node.style.backgroundColor) {
        bbcodeInner = `[highlight=${node.style.backgroundColor}]${bbcodeInner}[/highlight]`
      }
      if (node.style.color) {
        bbcodeInner = `[color=${node.style.color}]${bbcodeInner}[/color]`
      }
    }

    // Convert Quill element classes
    const attrs = quillAttrs(node)
    if (attrs.font) {
      bbcodeInner = `[font="${HTML_TO_BBCODE_FONTS[attrs.font]}"]${bbcodeInner}[/font]`
    }
    if (attrs.size) {
      bbcodeInner = `[size=${bbcodeSizeMap[attrs.size]}]${bbcodeInner}[/size]`
    }
    if (attrs.align && !['UL', 'OL', 'LI'].includes(node.nodeName)) {
      bbcodeOuterLeft = `[${attrs.align}]${bbcodeOuterLeft}`
      bbcodeOuterRight = `${bbcodeOuterRight}[/${attrs.align}]`
    }
    if (attrs.indent && !['UL', 'OL', 'LI'].includes(node.nodeName)) {
      bbcodeInner = `[indent data=${attrs.indent}]${bbcodeInner}[/indent]`
    }

    // Convert HTML tags
    const tags = bbcodeTagMap[node.nodeName]
      ? bbcodeTagMap[node.nodeName](node, listType)
      : ['', '']

    // In the case of alignment, move the \n of the tags to the end of close alignment tag
    if (bbcodeOuterRight != '' && tags[1].slice(-1) == '\n'){
      tags[1] = tags[1].slice(0, -1)
      bbcodeOuterRight += "\n"
    }
    return `${bbcodeOuterLeft}${tags[0]}${bbcodeInner}${tags[1]}${bbcodeOuterRight}`
  }

  // "translates" Quill html to bbcode to be consumed and usable by Bubble text fields
  const htmlToBBCode = (html) =>
    $.parseHTML(html)
      .map((node) => getBBCode(node))
      .join('')

  // "translates" bbcode to Quill html - useful when using dynamic values to set initial input
  const bbCodeToHTML = (bbcode) => {
    bbcode = bbcode.replace(/\[\/center\]/gi, "[/center]")
    bbcode = bbcode.replace(/\[\/right\]/gi, "[/right]")
    bbcode = bbcode.replace(/\[\/justify\]/gi, "[/justify]")

    // TODO: for all lines containing (.*?), use '/gmis' instead of '/gmi'
    bbcode = bbcode.replace(/\[center\](.*?)\[\/center\]/gmi, (x) => {
      x = x.replace(/\[center\](.*?)\[\/center\]/gmi, "$1")
      x = x.replace(/\[h1\]/gmi, "[center][h1]")
      x = x.replace(/\[\/h1\]\n/gmi, "[/h1][/center]")
      x = x.replace(/\[h2\]/gmi, "[center][h2]")
      x = x.replace(/\[\/h2\]\n/gmi, "[/h2][/center]")
      x = x.replace(/\[h3\]/gmi, "[center][h3]")
      x = x.replace(/\[\/h3\]\n/gmi, "[/h3][/center]")
      x = x.replace(/\[h4\]/gmi, "[center][h4]")
      x = x.replace(/\[\/h4\]\n/gmi, "[/h4][/center]")
      x = x.replace(/\[quote\]/gmi, "[center][quote]")
      x = x.replace(/\[\/quote\]/gmi, "[/quote][/center]")
      x = x.replace(/\[youtube\]/gmi, "[center][youtube]")
      x = x.replace(/\[\/youtube\]/gmi, "[/youtube][/center]")
      x = x.replace(/<br>/gmi, "[center][/center]")
      x = x.replace(/\[\/center\](.*?)\[center\]/gmi, "[/center][center]$1[/center][center]")
      x = x.replace(/\[center\]\[\/center\]/gmi, "")
      return x
    })

    bbcode = bbcode.replace(/\[right\](.*?)\[\/right\]/gmi, (x) => {
      x = x.replace(/\[right\](.*?)\[\/right\]/gmi, "$1")
      x = x.replace(/\[h1\]/gmi, "[right][h1]")
      x = x.replace(/\[\/h1\]\n/gmi, "[/h1][/right]")
      x = x.replace(/\[h2\]/gmi, "[right][h2]")
      x = x.replace(/\[\/h2\]\n/gmi, "[/h2][/right]")
      x = x.replace(/\[h3\]/gmi, "[right][h3]")
      x = x.replace(/\[\/h3\]\n/gmi, "[/h3][/right]")
      x = x.replace(/\[h4\]/gmi, "[right][h4]")
      x = x.replace(/\[\/h4\]\n/gmi, "[/h4][/right]")
      x = x.replace(/\[quote\]/gmi, "[right][quote]")
      x = x.replace(/\[\/quote\]/gmi, "[/quote][/right]")
      x = x.replace(/\[youtube\]/gmi, "[right][youtube]")
      x = x.replace(/\[\/youtube\]/gmi, "[/youtube][/right]")
      x = x.replace(/<br>/gmi, "[right][/right]")
      x = x.replace(/\[\/right\](.*?)\[right\]/gmi, "[/right][right]$1[/right][right]")
      x = x.replace(/\[right\]\[\/right\]/gmi, "")
      return x
    })

    bbcode = bbcode.replace(/\[justify\](.*?)\[\/justify\]/gmi, (x) => {
      x = x.replace(/\[justify\](.*?)\[\/justify\]/gmi, "$1")
      x = x.replace(/\[h1\]/gmi, "[justify][h1]")
      x = x.replace(/\[\/h1\]\n/gmi, "[/h1][/justify]")
      x = x.replace(/\[h2\]/gmi, "[justify][h2]")
      x = x.replace(/\[\/h2\]\n/gmi, "[/h2][/justify]")
      x = x.replace(/\[h3\]/gmi, "[justify][h3]")
      x = x.replace(/\[\/h3\]\n/gmi, "[/h3][/justify]")
      x = x.replace(/\[h4\]/gmi, "[justify][h4]")
      x = x.replace(/\[\/h4\]\n/gmi, "[/h4][/justify]")
      x = x.replace(/\[quote\]/gmi, "[justify][quote]")
      x = x.replace(/\[\/quote\]/gmi, "[/quote][/justify]")
      x = x.replace(/\[youtube\]/gmi, "[justify][youtube]")
      x = x.replace(/\[\/youtube\]/gmi, "[/youtube][/justify]")
      x = x.replace(/<br>/gmi, "[justify][/justify]")
      x = x.replace(/\[\/justify\](.*?)\[justify\]/gmi, "[/justify][justify]$1[/justify][justify]")
      x = x.replace(/\[justify\]\[\/justify\]/gmi, "")
      return x
    })

    bbcode = bbcode.replace(/\[size=1\](.*?)\[\/size\]/gmi, '<span class="ql-size-small">$1</span>')
    bbcode = bbcode.replace(/\[size=2\](.*?)\[\/size\]/gmi, '<span class="ql-size-small">$1</span>')
    bbcode = bbcode.replace(/\[size=3\](.*?)\[\/size\]/gmi, '$1')
    bbcode = bbcode.replace(/\[size=4\](.*?)\[\/size\]/gmi, '<span class="ql-size-large">$1</span>')
    bbcode = bbcode.replace(/\[size=5\](.*?)\[\/size\]/gmi, '<span class="ql-size-large">$1</span>')
    bbcode = bbcode.replace(/\[size=6\](.*?)\[\/size\]/gmi, '<span class="ql-size-huge">$1</span>')
    bbcode = bbcode.replace(/\[size=7\](.*?)\[\/size\]/gmi, '<span class="ql-size-huge">$1</span>')

    bbcode = bbcode.replace(/\[color=(.*?)\](.*?)\[\/color\]/gmi, '<span style="color:$1;">$2</span>')
    bbcode = bbcode.replace(/\[highlight=(.*?)\](.*?)\[\/highlight\]/gmi, '<span style="background-color:$1;">$2</span>')
    bbcode = bbcode.replace(/\[font="(.*?)"\](.*?)\[\/font\]/gmi, function(match, m1, m2){
      return `<span class="ql-font-${BBCODE_TO_HTML_FONTS[m1]}">${m2}</span>`
    })

    bbcode = bbcode.replace(/\[(center|right|justify)\]\[h1\]\[indent data=(.*?)\]/gmi, '<h1 class="ql-align-$1 ql-indent-$2">')
    bbcode = bbcode.replace(/\[(center|right|justify)\]\[h2\]\[indent data=(.*?)\]/gmi, '<h2 class="ql-align-$1 ql-indent-$2">')
    bbcode = bbcode.replace(/\[(center|right|justify)\]\[h3\]\[indent data=(.*?)\]/gmi, '<h3 class="ql-align-$1 ql-indent-$2">')
    bbcode = bbcode.replace(/\[(center|right|justify)\]\[h4\]\[indent data=(.*?)\]/gmi, '<h4 class="ql-align-$1 ql-indent-$2">')
    bbcode = bbcode.replace(/\[(center|right|justify)\]\[blockquote\]\[indent data=(.*?)\]/gmi, '<blockquote class="ql-align-$1 ql-indent-$2">')

    bbcode = bbcode.replace(/\[(center|right|justify)\]\[h1\]/gmi, '<h1 class="ql-align-$1">')
    bbcode = bbcode.replace(/\[(center|right|justify)\]\[h2\]/gmi, '<h2 class="ql-align-$1">')
    bbcode = bbcode.replace(/\[(center|right|justify)\]\[h3\]/gmi, '<h3 class="ql-align-$1">')
    bbcode = bbcode.replace(/\[(center|right|justify)\]\[h4\]/gmi, '<h4 class="ql-align-$1">')
    bbcode = bbcode.replace(/\[(center|right|justify)\]\[blockquote\]/gmi, '<blockquote class="ql-align-$1">')

    bbcode = bbcode.replace(/\[(center|right|justify)\]\[youtube\](.*?)\[\/youtube\]\[\/(center|right|justify)\]/gi, '<iframe class="ql-video ql-align-$1" frameborder="0" allowfullscreen="true" src="https://www.youtube.com/embed/$2?showinfo=0">')

    bbcode = bbcode.replace(/\[h1\]\[indent data=(.*?)\]/gmi, '<h1 class="ql-indent-$1">')
    bbcode = bbcode.replace(/\[h2\]\[indent data=(.*?)\]/gmi, '<h2 class="ql-indent-$1">')
    bbcode = bbcode.replace(/\[h3\]\[indent data=(.*?)\]/gmi, '<h3 class="ql-indent-$1">')
    bbcode = bbcode.replace(/\[h4\]\[indent data=(.*?)\]/gmi, '<h4 class="ql-indent-$1">')
    bbcode = bbcode.replace(/\[blockquote\]\[indent data=(.*?)\]/gmi, '<blockquote class="ql-indent-$1">')

    bbcode = bbcode.replace(/\[(center|right|justify)\]\[indent data=(.*?)\](.*?)\[\/indent\]\[\/(center|right|justify)\]/gmi, '<p class="ql-align-$1 ql-indent-$2">$3</p>')
    bbcode = bbcode.replace(/\[(center|right|justify)\](.*?)\[\/\1\]/gmis, '<p class="ql-align-$1">$2</p>')
    bbcode = bbcode.replace(/\[indent data=(.*?)\](.*?)\[\/indent\]/gmi, '<p class="ql-indent-$1">$2</p>')

    bbcode = bbcode.replace(/\[b\]/gi, "<strong>")
    bbcode = bbcode.replace(/\[\/b\]/gi, "</strong>")
    bbcode = bbcode.replace(/\[i\]/gi, "<em>")
    bbcode = bbcode.replace(/\[\/i\]/gi, "</em>")
    bbcode = bbcode.replace(/\[u\]/gi, "<u>")
    bbcode = bbcode.replace(/\[\/u\]/gi, "</u>")
    bbcode = bbcode.replace(/\[s\]/gi, "<s>")
    bbcode = bbcode.replace(/\[\/s\]/gi, "</s>")
    bbcode = bbcode.replace(/\[quote\]/gi, "<blockquote>")
    bbcode = bbcode.replace(/\[\/quote\]/gi, "</blockquote>")
    bbcode = bbcode.replace(/\[code\]/gi, "<pre>")
    bbcode = bbcode.replace(/\[\/code\]/gi, "</pre>")
    bbcode = bbcode.replace(/\[sub\]/gi, "<sub>")
    bbcode = bbcode.replace(/\[\/sub\]/gi, "</sub>")
    bbcode = bbcode.replace(/\[sup\]/gi, "<sup>")
    bbcode = bbcode.replace(/\[\/sup\]/gi, "</sup>")
    bbcode = bbcode.replace(/\[h1\]/gi, "<h1>")

    // html to bbcode enters '\n' at the end of closing h1 tags, detect the newline along with the tag to avoid duplicate spaces
    bbcode = bbcode.replace(/\[\/h1]\n?/gi, "</h1>")
    bbcode = bbcode.replace(/\[h2\]/gi, "<h2>")
    bbcode = bbcode.replace(/\[\/h2\]\n?/gi, "</h2>")
    bbcode = bbcode.replace(/\[h3\]/gi, "<h3>")
    bbcode = bbcode.replace(/\[\/h3\]\n?/gi, "</h3>")
    bbcode = bbcode.replace(/\[h4\]/gi, "<h4>")
    bbcode = bbcode.replace(/\[\/h4\]\n?/gi, "</h4>")
    bbcode = bbcode.replace(/\[\/indent\]/gi, "")
    bbcode = bbcode.replace(/\[\/center\]/gi, "")
    bbcode = bbcode.replace(/\[\/right\]/gi, "")
    bbcode = bbcode.replace(/\[\/justify\]/gi, "")

    bbcode = bbcode.replace(/\[hr\]/gi, "")
    bbcode = bbcode.replace(/\[email(.*?)\]/gi, "")
    bbcode = bbcode.replace(/\[\/email\]/gi, "")
    bbcode = bbcode.replace(/\[left\]/gi, "")
    bbcode = bbcode.replace(/\[\/left\]/gi, "")

    bbcode = bbcode.replace(/\[ml\]\[ol\](.*?)\[\/ol\]\[\/ml\]/gmi, "<ol>$1</ol>")
    bbcode = bbcode.replace(/\[ml\]\[ul\](.*?)\[\/ul\]\[\/ml\]/gmi, "<ul>$1</ul>")
    bbcode = bbcode.replace(/\[ol(.*?)\]/gi, "")
    bbcode = bbcode.replace(/\[\/ol\]/gi, "")
    bbcode = bbcode.replace(/\[ul(.*?)\]/gi, "")
    bbcode = bbcode.replace(/\[\/ul\]/gi, "")
    bbcode = bbcode.replace(/\[li indent=(.*?) align=(.*?)\]/gi, (x) => {
      const indent = x.replace(/\[li indent=(.*?) align=(.*?)\]/gi, "$1")
      const alignment = x.replace(/\[li indent=(.*?) align=(.*?)\]/gi, "$2")
      let result = "<li"
      if (indent !== '0' || alignment !== 'left'){
        result += ' class="'
      }
      if (indent !== '0'){
        result += 'ql-indent-' + indent
      }
      if (alignment !== 'left'){
        result += ' ql-align-' + alignment
      }
      if (indent !== '0' || alignment !== 'left'){
        result += '"'
      }
      return result + ">"
    })
    bbcode = bbcode.replace(/\[li\]/gi, "<li>")
    bbcode = bbcode.replace(/\[\/li\]/gi, "</li>")

    bbcode = bbcode.replace(/\[img width=(.*?)\](.*?)\[\/img\]/gmi, '<img src="$2" width="$1">')
    bbcode = bbcode.replace(/\[img\](.*?)\[\/img\]/gmi, '<img src="$1">')
    bbcode = bbcode.replace(/\[url=(.*?)\](.*?)\[\/url\]/gi, '<a href="$1" target="_blank">$2</a>')
    bbcode = bbcode.replace(/\[youtube\](.*?)\[\/youtube\]/gi, '<iframe class="ql-video" frameborder="0" allowfullscreen="true" src="https://www.youtube.com/embed/$1?showinfo=0"></iframe>')
    bbcode = bbcode.replace(/\[video\](.*?)\[\/video\]/gi, '<iframe class="ql-video" frameborder="0" allowfullscreen="true" src="$1"></iframe>')

    //new line conversion is way down here because it needs to happen after digesting all closing header + \n
    bbcode = bbcode.replace(/\n/gi, "<br>")

    return bbcode
  }

  const getToolbarHeight = () => {
    if (properties.theme !== 'Regular') return 0
    const toolbarElement = d.elements.toolbarElement
    return Number(toolbarElement.css('height').replace(/px/gmi, '')) - 10
  }

  // calculates full height of content
  const calculateHeight = (quill, initial_height, toolbar_height) => {
    const quillRoot = d.elements.quillRoot
    const scrollHeight = quillRoot[0].scrollHeight
    const children = quillRoot[0].children
    let lowestElement = scrollHeight
    if (children) {
      lowestElement = children[children.length - 1].offsetTop + children[children.length - 1].clientHeight + 10
    }

    //height never goes below whatever the initial height is set to - initial height = height set in the editor
    if (lowestElement > initial_height - toolbar_height) {
      quillRoot.parent().css('height', lowestElement + "px")
      return lowestElement + toolbar_height + BOTTOM_TEXT_MARGIN
    } else {
      return initial_height
    }
  }

  // callback invoked when the user is done typing, in a debounced fashion
  // i.e. not after every keystroke, but a certain amount of time after the last keystroke.
  const done_typing = () => {
    if (d.should_rerun_val && d.last_update_props.autosave) set_val()
  }

  // handles text changes and blur events
  const set_val = () => {
    // regex removes excess line feed inserted by quill, otherwise :number of characters if off by 1
    const new_bbcode = htmlToBBCode(d.quill.root.innerHTML).replace(/\n$/, '')
    const did_content_change = d.current_bbcode !== new_bbcode
    d.current_bbcode = new_bbcode
    instance.publishState("value_html", d.quill.root.innerHTML)
    if (did_content_change) {
      notify_content_changed(new_bbcode)
      
    }
    d.pasted = false
  }

  // notify the external world that the content has changed
  const notify_content_changed = (bbcode) => {
    d.should_rerun_val = false

    //cheat to avoid re-draw on next update
    d.last_update_props.autobinding = bbcode
    instance.publishAutobinding(bbcode)
    instance.publishState("value", bbcode)

    instance.triggerEvent('value_changes', (err) => {
      if (err) {
        console.error("Rich text event error - please report to admin: " + JSON.stringify(err))
      }
    })

    // Publishes boolean indicating whether the input is valid
    // not valid if the input is empty and the user has checked "this input should not be empty"
    instance.publishState("value_is_valid", is_valid())
  }

  const is_valid = () => {
    const quill = d.quill

    if (properties.empty_is_invalid) {
      return checkForContent(quill.root.innerHTML) !== ''
    }
    return true
  }

  // handle the quill instance telling us that its value has changed.
  // this can result either from us setting the value, or the user making an edit
  const handle_quill_text_change_event = (delta, oldDelta, source) => {
    // early return for change induced by setting value ourselves
    if (d.last_change_source === 'bubble_update') return

    d.last_change_source = source
    if (d.last_change_source === 'user') {
      d.has_been_edited = true
    }
    if (get_current_content_bbcode() === properties.initial_content) {
      d.has_been_edited = false
    }
    d.should_rerun_val = true
    d.prev_contents = htmlToBBCode(d.quill.root.innerHTML)
    // reset debounce timer
    clearTimeout(d.typing_timer_id)
    d.typing_timer_id = setTimeout(done_typing, DONE_TYPING_INTERVAL_MS)

    if (d.quill.theme.modules.imageResize.overlay && !d.has_resize_listener) {
      d.has_resize_listener = true
      $(d.quill.theme.modules.imageResize.overlay).one('mouseup', () => {
        done_typing()
        d.has_resize_listener = false
      })
    }

    fixup_images()

    wait_for_visible(update_element_height)
    d.pasted = false

    set_initial_content(source)
  }

  const fixup_images = () => {
    const quillRoot = d.elements.quillRoot
    quillRoot.find('img').load(() => {
      wait_for_visible(update_element_height)
    })

    quillRoot.find('img').each((index, element) => {
      $(element).data('width', $(element).css('width'))
    })

    upload_and_replace_inline_images()
  }

  const upload_and_replace_inline_image = (file_extension, source) => {
    context.uploadContent(`richtext_content.${file_extension}`, source, (err, url) => {
      const quillRoot = d.elements.quillRoot
      const upload_width = quillRoot
        .find(`img[src="data:image/${file_extension};base64,${source}"]`)
        .css('width') || ""
      quillRoot
        .find(`img[src="data:image/${file_extension};base64,${source}"]`)
        .attr({'src': url, 'width': upload_width})
    })
  }

  const upload_and_replace_inline_images = () => {
    const quill = d.quill

    const rawhtml = quill.root.innerHTML

    const base64ImageRegex = /<img[^>]* src="data:image\/(.*?)"(.*?)>/gi
    const matches = rawhtml.match(base64ImageRegex) || []

    let img_change = false
    if (matches.length !== d.img_tracker) {
      img_change = true
      d.img_tracker = matches.length
    }

    let fullMatch = base64ImageRegex.exec(rawhtml)
    let encoding, base64source
    while (img_change && fullMatch) {
      [encoding, base64source] = fullMatch[1].split(',') || []
      const file_extension = (encoding || '').split(';')[0]

      if (SUPPORTED_FILE_EXTENSIONS[file_extension]) {
        upload_and_replace_inline_image(file_extension, base64source)
      }
      fullMatch = base64ImageRegex.exec(rawhtml)
    }
  }

  const register_fonts_and_icons = () => {
    const FontAttributor = window.Quill.import('attributors/class/font')
    FontAttributor.whitelist = [...ALL_FONTS]
    window.Quill.register(FontAttributor, true)

    const icons = window.Quill.import('ui/icons')
    icons.header[1] = ICON_H1
    icons.header[2] = ICON_H2
    icons.header[3] = ICON_H3
    icons.header[4] = ICON_H4
  }

  // initialize an instance of the quill editor
  const initialize_quill = () => {
    instance.canvas.empty()

    // Import Delta module from Quill
    const Delta = window.Quill.import('delta')
    // create unique ID in case more than one Rich Text input is added to a page
    if (!d.element_id) d.element_id =  `richtext-editor-${$('.ql-container').length}`

    // Quill.js themes
    register_fonts_and_icons()
    const theme = properties.theme === 'Regular' ? 'snow' : 'bubble'

    // Initialize toolbar based on desired complexity
    let toolbar
    if (properties.complexity === "Basic") {
      toolbar = [
        [ 'bold', 'italic', 'link'],
        [{ 'align': [] },{ 'header': '1' }, { 'header': '2' }]
      ]
    } else if (properties.complexity === "Medium") {
      toolbar = [
        [{font: [...ALL_FONTS] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ color: [] }, { background: [] }],
        [{ header: '1' }, { header: '2' }, { header: '3' },{ header: '4' }],
        [{ list: 'ordered' }, { list: 'bullet'}],
        [{ indent: '-1' }, { indent: '+1' }, { align: [] }, 'link']
      ]
    } else {
      toolbar = [
        [{ font: [...ALL_FONTS] }, { size: [] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ color: [] }, { background: [] }],
        [{ script: 'super' }, { script: 'sub' }],
        [{ header: '1' }, { header: '2' }, { header: '3' }, { header: '4' }, 'blockquote', 'code-block'],
        [{ list: 'ordered' }, { list: 'bullet'}],
        [{ indent: '-1' }, { indent: '+1' }, { align: [] }],
        ['link', 'image', 'video'], ['clean']
      ]
    }
	
      if(properties.text_insertion_dropdown){
          var textInsertionDropdown = [{ 'variables': ["1", "2", "3", "4"]}];
          toolbar.push(textInsertionDropdown);
          if(properties.text_insertion_list){
              instance.data.mytexts = properties.text_insertion_list.get(0,properties.text_insertion_list.length());
            console.log(instance.data.mytexts);
          	//var _length = properties.text_insertion_list.length;
          	//console.log(properties.text_insertion_list.get(0,2))    
          }
          
      }
    // add Quill container div to page
    instance.canvas.append(`<div id="${d.element_id}"></div>`)

    // initialize Quill
    const quill = new window.Quill(`#${d.element_id}`, {
      theme: theme,
      bounds: `#${d.element_id}`,
      modules: {
        imageResize: {
          modules: [ 'Resize', 'DisplaySize']
        },
        toolbar: {
            container: toolbar,
            handlers: {
                "variables": function(args) {
                  console.log('variables')
                  const value = args[0]
                  const cursorPosition = this.quill.getSelection().index
                  if (value == 1) {
                    this.quill.insertText(cursorPosition, "{AccountURL}")
                  } else if (value == 2) {
                    this.quill.insertText(cursorPosition, "{FirstName}")
                  } else if (value == 3) {
                    this.quill.insertText(cursorPosition, "{Login}")
                  } else if (value == 4) {
                    this.quill.insertText(cursorPosition, "{OrganizationName}")
                  } else if (value == 5) {
                    this.quill.insertText(cursorPosition, "{SupportEmail}")
                  } else {
                    this.quill.insertText(cursorPosition, "Please add an email variable.")
                  }

                  this.quill.setSelection(cursorPosition + value.length)
				  
                }
            }
        },
        clipboard: {},
        history: {
          // Prevent any Bubble-initiated changes from adding a history entry
          userOnly: true
        }
      },
      placeholder: d.updated_props.placeholder || ''
    })
    
    const rteContainer = $(quill.container)
    d.elements.rteContainer = rteContainer

    rteContainer.css('border','none')

    const toolbarElement = rteContainer.siblings('.ql-toolbar')
    d.elements.toolbarElement = toolbarElement

    if (properties.bubble.border_style() !== "none" && theme === "snow") {
      toolbarElement.css({
        border: 'none',
        'border-bottom': '1px solid #ccc'
      })
    }

    // Matcher to process fonts (especially two worded fonts) correctly
    // Span elements directly wrap the text content, and this is what we're going to use
    // to identify the font, via the ql-font-... class
    quill.clipboard.addMatcher('span', (node, delta) => {
      // identify the class that indicates the class we need
      for (const node_class of node.classList) {
        if (!node_class.startsWith('ql-font-')) continue
        const matched_font = node_class.replace('ql-font-', '')
        if (!ALL_FONTS.has(matched_font) || matched_font === 'sans-serif') continue
        return delta.compose(new Delta().retain(delta.length(), { font: matched_font }))
      }
      return delta
    })

    const quillRoot = $(quill.root)
    d.elements.quillRoot = quillRoot

    //add tooltips to icons for clarity
    $('.ql-bold').attr('title', 'Bold')
    $('.ql-italic').attr('title', 'Italic')
    $('.ql-underline').attr('title', 'Underline')
    $('.ql-header[value="1"]').attr('title', "Title")
    $('.ql-header[value="2"]').attr('title', "Subtitle")
    $('.ql-align').attr('title', 'Text alignment')
    if (['Full', 'Medium'].includes(properties.complexity)) {
      $('.ql-header[value="3"]').attr('title', "Subtitle")
      $('.ql-header[value="4"]').attr('title', "Subtitle")
      $('.ql-strike').attr('title', 'Strikethrough')
      $('.ql-color').attr('title', 'Font color')
      $('.ql-background').attr('title', 'Highlight color')
      $('.ql-font').attr('title', 'Font')
      $('.ql-list[value="ordered"]').attr('title', "Numbered list")
      $('.ql-list[value="bullet"]').attr('title', "Bulleted list")
      $('.ql-indent[value="+1"]').attr('title', "Indent")
      $('.ql-indent[value="-1"]').attr('title', "Remove indent")
      $('.ql-link').attr('title', 'Link')
    }
    if (properties.complexity === 'Full') {
      $('.ql-size').attr('title', 'Font size')
      $('.ql-script[value="super"]').attr('title', "Superscript")
      $('.ql-script[value="sub"]').attr('title', "Subscript")
      $('.ql-blockquote').attr('title', 'Quote')
      $('.ql-code-block').attr('title', 'Code')
      $('.ql-image').attr('title', 'Image')
      $('.ql-video').attr('title', 'Video')
      $('.ql-clean').attr('title', 'Remove all formatting')
    }

    $('.ql-font .ql-picker-options').css({ height: '250px', overflow: 'scroll' })

    // Use BBCode font caption, which is human-readable
    $('.ql-font .ql-picker-options .ql-picker-item').each((index, element) => {
      $(element).attr('data-label', HTML_TO_BBCODE_FONTS[$(element).data('value')])
    })

    // initialize helpful variables for later on:
    d.quill = quill

    // sets placeholder for link input to https://bubble.io/
    const tooltip = quill.theme.tooltip
    const input = tooltip.root.querySelector("input[data-link]")
    input.dataset.link = properties.link_placeholder

    // == bind event handlers on newly-initialized Quill instance ==

    // positions the image resize module correctly when scrolling
    quillRoot.on('scroll', () => {
      const resize_obj = rteContainer.children()[3]
      if (resize_obj && !resize_obj.hidden){
        quill.theme.modules.imageResize.repositionElements()
      }
    })

    // if image is resized, updates the value right away instead of waiting for the DONE_TYPING_INTERVAL_MS timer
    rteContainer.mouseup(() => {
      if (rteContainer.children()[3]) {
        done_typing()
      }
    })

    // bind on/off focus events
    const rte_canvas = rteContainer.children()[0]

    rte_canvas.onfocus = () => {
      instance.publishState("field_is_focused", true)
    }

    rte_canvas.onblur = () => {
      if (d.pasted) return

      instance.publishState("field_is_focused", false)
      clearTimeout(d.typing_timer_id)
      if (d.should_rerun_val) {
        set_val()
      }
    }

    $('.ql-toolbar').mousedown(e => e.preventDefault())

    // actions to be run whenever the Quill text is changed
    quill.on('text-change', handle_quill_text_change_event)

    // hides image resize module outline if any formatting buttons are pressed
    $('.ql-formats').on('click', () => rteContainer.children().eq(3).hide())

    // run the validation on initialization to avoid breaking change
    // @TODO inconsistent styling with regular inputs, pristine should register as "valid"
    //instance.publishState("value_is_valid", true)
    d.initialized = true
  }

  // set the quill editor to show the given bbcode
  d.set_content_in_quill = (bbcode) => {
    const quill = d.quill

    // paste the HTML even if current_bbcode matches initial content,
    // to mitigate wrong initial content from persisting in editor if the data the RTE is autobinding to changes
    const html = bbCodeToHTML(bbcode)

    // The proper way to insert content into a Quill editor is to convert it into a delta via quill.clipboard.convert
    // We can then set the content of the editor using the delta object.
    const desired_delta = quill.clipboard.convert(html)

    // Add an extra newline because quill has the bad habit of trimming it (not all of them, just the last one...).
    desired_delta.insert('\n')

    const current_delta = quill.getContents()

    if(d.helpers.deltaIsEqual(current_delta, desired_delta)) {
      return
    }
    // Get the last modified part to indicate where the cursor in the text editor
    const current_selection = quill.getSelection()

    // Pasting the contents programmatically focuses the editor and sets
    // the cursor to the end, which breaks autobinding and is weird UX,
    // so restoring initial selection below

    // preserve the last change source, while forcing it to be 'bubble_update' when setting contents,
    // in order to prevent extra change loops from running
    const actual_change_source = d.last_change_source
    d.last_change_source = 'bubble_update'

    // Set content
    quill.setContents(desired_delta)
    d.last_change_source = actual_change_source
    // Indicate we've set the content for the first time.
    if (d.did_set_content_first_time) {
      d.did_set_content_first_time = false
    }

    if (current_selection) quill.setSelection(current_selection)

    // no good way to know what cmd+z should do after an external change, so clear history
    quill.history.clear()

    // if the content contains images, wait until they're loaded to set the height
    const images = d.elements.quillRoot.find('img')
    if (images.length === 0) {
      wait_for_visible(update_element_height)
    } else {
      images.on('load.imgdl error.imgdl', () => {
        wait_for_visible(update_element_height)
        $(this).off('.imgdl')
      })
    }


    instance.publishState('value', bbcode)
  }

  const should_reinitialize = () => {
    if (!d.initialized) return true
    const PROPS_THAT_NEED_REINITIALIZATION = ['theme', 'complexity']
    for (const prop of PROPS_THAT_NEED_REINITIALIZATION) {
      if (prop in d.updated_props) return true
    }
    return false
  }

  const get_plugin_element_inner_height = (height) => {
    const {
      four_border_style,
      border_width,
      border_width_top,
      border_width_bottom,
      border_style,
      border_style_top,
      border_style_bottom,
      padding_vertical
    } = d.last_update_bubble_props

    let vertical_border_total
    if (four_border_style) {
      vertical_border_total = (
        (border_style_top !== 'none' ? border_width_top : 0) +
        (border_style_bottom !== 'none' ? border_width_bottom : 0)
      )
    } else {
      vertical_border_total = 2 * (border_style !== 'none' ? border_width : 0)
    }
    return height - 2 * padding_vertical - vertical_border_total
  }

  const should_set_height = () => {
    const PROPS_THAT_UPDATE_HEIGHT = [
      'overflow',
      'autobinding',
      'theme',
      'complexity'
    ]
    const BUBBLE_PROPS_THAT_UPDATE_HEIGHT = [
      'four_border_style',
      'vertical_padding',
      'border',
      'border_style',
      'border_style_top',
      'border_style_bottom',
      'border_width',
      'border_width_top',
      'border_width_bottom',
    ]
    for (const prop of BUBBLE_PROPS_THAT_UPDATE_HEIGHT) {
      if (prop in d.updated_bubble_props) return true
    }
    for (const prop of PROPS_THAT_UPDATE_HEIGHT) {
      if (prop in d.updated_props) return true
    }
  }

  const update_element_height = () => {
    let outer_element_height
    const toolbar_inner_height = getToolbarHeight()
    if (d.last_update_props.overflow) {
      outer_element_height = calculateHeight(d.quill, d.initial_height, toolbar_inner_height)
      d.elements.quillRoot.css('overflow-y', 'hidden')
    } else {
      outer_element_height = d.initial_height
      d.elements.quillRoot.css('overflow-y', 'scroll')
    }

    const TOOLBAR_TOTAL_VERTICAL_PADDING = 10

    // adjust height of the Quill editor if a toolbar exists so that it doesn't overflow from the Bubble element
    const inner_element_height = get_plugin_element_inner_height(outer_element_height)

    // Sizing includes padding, which causes tiny overflow when height extends
    d.elements.quillRoot.css('overflow-y', d.last_update_props.overflow ? 'hidden' : 'auto')

    if (properties.theme === "Regular") {
      const toolbar_total_height = toolbar_inner_height + TOOLBAR_TOTAL_VERTICAL_PADDING
      d.elements.rteContainer.css('height', `${inner_element_height - toolbar_total_height}px`)
      $('.ql-header').addClass('regular-header-icon')
    } else {
      d.elements.rteContainer.css('height', `${inner_element_height}px`)
      $('.ql-header').addClass('tooltip-header-icon')
    }

    // head-start to bypass next redundant update
    d.last_update_bubble_props.height = outer_element_height
    instance.setHeight(outer_element_height)
  }

  // Allow setting initial content dynamically if the initial content has changed and data has not been edited
  const set_initial_content = (source) => {
    if (source === 'user' || source === 'silent') {
      return
    }
    if (
      !properties.autobinding &&
      properties.initial_content !== d.initial_bbcode &&
      !d.has_been_edited
    ) {
      // write to the initial_content property
      properties.initial_content = d.initial_bbcode
    }
  }

  // If the properties.autobinding resolves to null, equate that with an empty string
  const get_non_null_autobinding_value = () => {
    return properties.autobinding || ''
  }

  // get the content that the editor should be set to right now
  const get_current_content_bbcode = () => {
    // On first pass after an update, we want to make sure that the content that we use is the one that was input by the user just before
    // the update. This situation arises when the editor is set to fit to expand (overflow = true). In this case, when we reach the final
    // line and create a new line, if the editor needs to expand, it triggers update_element_height.
    // However, when this happens, the autobinding content is different from the last one that the user input, and this causes the
    // height to reset. The user is no longer able to input anything, as the quill editor keeps bouncing back to the autobinding content.
    if (d.did_set_content_first_time && d.last_change_source === 'user') {
      return d.prev_contents || ""
    }

    if (d.is_autobound) {
      return get_non_null_autobinding_value()
    }

    // only set initial content if the user hasn't made edits
    if (!d.has_been_edited) {
      // prevents the same initial content from loading more than once
      // initialize flag to see if html should actually be translated to bbcode later on
      d.should_rerun_val = false
      return properties.initial_content || ""
    } else {
      return d.prev_contents
    }
  }

  const get_initial_content_bbcode = () => {
    if (d.is_autobound) {
      if (properties.initial_content) {
        console.warn("Ignoring initial content since autobinding is enabled.")
      }
      return get_non_null_autobinding_value(properties)
    }
    return properties.initial_content || ""
  }

 
  d.insertText = (textVal) => {
    if (d.allowTextInsertion===false || textVal===undefined || textVal===null ) {
     	if(d.allowTextInsertion){
            console.log("Invalid text value to insert");
        }
        else{
            console.log("Allow Text Insertions plugin element properties");
        }
        return;
    }
    d.quill.focus();
    var symbol = textVal;
    var caretPosition = d.quill.getSelection(true);
    d.quill.insertText( d.quill.getLength() - 1, symbol);  
  }
  
  // main entry point: reconcile quill instance with new properties, or create it if it doesn't exist.
  const reconcile = () => {

    let content_bbcode = ''
    if (d.initial_bbcode !== get_initial_content_bbcode()) {
      // initial_bbcode and initial_html can change if initial content is a dynamic expression
      content_bbcode = get_initial_content_bbcode()
      // these are used by the reset action
      d.initial_html = bbCodeToHTML(content_bbcode)
      d.initial_bbcode = content_bbcode
    }

    if (d.initialized) content_bbcode = get_current_content_bbcode()
    // Regardless of other logic, when auto-binding, this should be the source of truth
    if (d.updated_props.autobinding) content_bbcode = get_non_null_autobinding_value()


    if (should_reinitialize()) initialize_quill()
    // It may seema bit contradictory that height is set before contents are,
    // but this allows for separating these concerns when contents don't change
    // and set_contents_in_quill also separately calls update_element_height
    // after it actually does change contents.
    if (should_set_height()) wait_for_visible(update_element_height)

    // disable Quill input if this element is disabled
    if ('disabled' in d.updated_props) {
      d.quill.enable(!d.updated_props.disabled)
    }

    // Dynamically set the placeholder
    if ('placeholder' in d.updated_props) {
      d.quill.root.dataset.placeholder = d.updated_props.placeholder || ''
    }

    // set content based on what mode we're in
    d.set_content_in_quill(content_bbcode)
    d.prev_contents = content_bbcode
    d.has_been_reconciled = true
  }

  d.has_been_reconciled = false
  $(document).ready(reconcile)
}
