function(instance, context) {
    const d = instance.data
    d.allowTextInsertion = false;
    d.insertText;
    d.textInsertionList=[];

    // === set plugin constants ===
    d.consts = {}

    d.consts.DONE_TYPING_INTERVAL_MS = 2200
    // handles images -> base64 images cannot be loaded in our text elements,
    // so this functionality identifies base64 files and uploads them to our S3 bucket and replaces the src value with the S3 url
    d.consts.SUPPORTED_FILE_EXTENSIONS = {
        jpg: true,
        jpeg: true,
        png: true,
        gif: true,
      }

    d.consts.BOTTOM_TEXT_MARGIN = 20
    d.consts.ICON_H1 = `
    <svg width="17px" height="12px" viewBox="0 0 17 12" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
        <g id="Page-1" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
            <g id="h3" fill="currentColor">
                <path d="M1.992,12.728 C1.81066576,12.9093342 1.58966797,13 1.329,13 C1.06833203,13 0.84733424,12.9093342 0.666,12.728 C0.48466576,12.5466658 0.394,12.325668 0.394,12.065 L0.394,1.525 C0.394,1.26433203 0.48466576,1.04333424 0.666,0.862 C0.84733424,0.68066576 1.06833203,0.59 1.329,0.59 C1.58966797,0.59 1.81066576,0.68066576 1.992,0.862 C2.17333424,1.04333424 2.264,1.26433203 2.264,1.525 L2.264,5.503 C2.264,5.60500051 2.31499949,5.656 2.417,5.656 L7.381,5.656 C7.48300051,5.656 7.534,5.60500051 7.534,5.503 L7.534,1.525 C7.534,1.26433203 7.62466576,1.04333424 7.806,0.862 C7.98733424,0.68066576 8.20833203,0.59 8.469,0.59 C8.72966797,0.59 8.95066576,0.68066576 9.132,0.862 C9.31333424,1.04333424 9.404,1.26433203 9.404,1.525 L9.404,12.065 C9.404,12.325668 9.31333424,12.5466658 9.132,12.728 C8.95066576,12.9093342 8.72966797,13 8.469,13 C8.20833203,13 7.98733424,12.9093342 7.806,12.728 C7.62466576,12.5466658 7.534,12.325668 7.534,12.065 L7.534,7.271 C7.534,7.16899949 7.48300051,7.118 7.381,7.118 L2.417,7.118 C2.31499949,7.118 2.264,7.16899949 2.264,7.271 L2.264,12.065 C2.264,12.325668 2.17333424,12.5466658 1.992,12.728 Z M11.42,8.63 C11.3266662,8.7033337 11.2283339,8.7133336 11.125,8.66 C11.0216661,8.6066664 10.97,8.5200006 10.97,8.4 L10.97,7.67 C10.97,7.2899981 11.1233318,6.9900011 11.43,6.77 L12.44,6.03 C12.7400015,5.8099989 13.0833314,5.7 13.47,5.7 L14.1,5.7 C14.2533341,5.7 14.3866661,5.7566661 14.5,5.87 C14.6133339,5.9833339 14.67,6.1166659 14.67,6.27 L14.67,12.43 C14.67,12.5833341 14.6133339,12.7166661 14.5,12.83 C14.3866661,12.9433339 14.2533341,13 14.1,13 L13.47,13 C13.3166659,13 13.1833339,12.9433339 13.07,12.83 C12.9566661,12.7166661 12.9,12.5833341 12.9,12.43 L12.9,7.57 L12.88,7.57 L11.42,8.63 Z" id="Shape" fill-rule="nonzero"></path>
            </g>
        </g>
    </svg>`

    d.consts.ICON_H2 = `
    <svg width="17px" height="12px" viewBox="0 0 17 12" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
        <g id="Page-1" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
            <g id="h3" fill="currentColor">
                <path d="M1.992,12.728 C1.81066576,12.9093342 1.58966797,13 1.329,13 C1.06833203,13 0.84733424,12.9093342 0.666,12.728 C0.48466576,12.5466658 0.394,12.325668 0.394,12.065 L0.394,1.525 C0.394,1.26433203 0.48466576,1.04333424 0.666,0.862 C0.84733424,0.68066576 1.06833203,0.59 1.329,0.59 C1.58966797,0.59 1.81066576,0.68066576 1.992,0.862 C2.17333424,1.04333424 2.264,1.26433203 2.264,1.525 L2.264,5.503 C2.264,5.60500051 2.31499949,5.656 2.417,5.656 L7.381,5.656 C7.48300051,5.656 7.534,5.60500051 7.534,5.503 L7.534,1.525 C7.534,1.26433203 7.62466576,1.04333424 7.806,0.862 C7.98733424,0.68066576 8.20833203,0.59 8.469,0.59 C8.72966797,0.59 8.95066576,0.68066576 9.132,0.862 C9.31333424,1.04333424 9.404,1.26433203 9.404,1.525 L9.404,12.065 C9.404,12.325668 9.31333424,12.5466658 9.132,12.728 C8.95066576,12.9093342 8.72966797,13 8.469,13 C8.20833203,13 7.98733424,12.9093342 7.806,12.728 C7.62466576,12.5466658 7.534,12.325668 7.534,12.065 L7.534,7.271 C7.534,7.16899949 7.48300051,7.118 7.381,7.118 L2.417,7.118 C2.31499949,7.118 2.264,7.16899949 2.264,7.271 L2.264,12.065 C2.264,12.325668 2.17333424,12.5466658 1.992,12.728 Z M11.35,13 C11.1966659,13 11.0633339,12.9433339 10.95,12.83 C10.8366661,12.7166661 10.78,12.5833341 10.78,12.43 L10.78,12.2 C10.78,11.8266648 10.9299985,11.5233345 11.23,11.29 C12.3500056,10.4099956 13.0916649,9.7400023 13.455,9.28 C13.8183351,8.8199977 14,8.3700022 14,7.93 C14,7.3166636 13.6600034,7.01 12.98,7.01 C12.5666646,7.01 12.060003,7.1233322 11.46,7.35 C11.3333327,7.3966669 11.2133339,7.3833337 11.1,7.31 C10.9866661,7.2366663 10.93,7.133334 10.93,7 L10.93,6.58 C10.93,6.4066658 10.9799995,6.25166735 11.08,6.115 C11.1800005,5.97833265 11.3133325,5.8866669 11.48,5.84 C12.0866697,5.6799992 12.6699972,5.6 13.23,5.6 C14.0366707,5.6 14.6583312,5.79166475 15.095,6.175 C15.5316688,6.55833525 15.75,7.0899966 15.75,7.77 C15.75,8.3566696 15.5650018,8.91499735 15.195,9.445 C14.8249981,9.97500265 14.1033387,10.6933288 13.03,11.6 C13.0233333,11.6066667 13.02,11.6133333 13.02,11.62 C13.02,11.6266667 13.0233333,11.63 13.03,11.63 L15.22,11.63 C15.3733341,11.63 15.5049995,11.6866661 15.615,11.8 C15.7250006,11.9133339 15.78,12.0466659 15.78,12.2 L15.78,12.43 C15.78,12.5833341 15.7250006,12.7166661 15.615,12.83 C15.5049995,12.9433339 15.3733341,13 15.22,13 L11.35,13 Z" id="Shape" fill-rule="nonzero"></path>
            </g>
        </g>
    </svg>`

    d.consts.ICON_H3 = `
    <svg width="17px" height="12px" viewBox="0 0 17 12" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
        <g id="Page-1" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
            <g id="h3" fill="currentColor">
                <path d="M1.992,12.728 C1.81066576,12.9093342 1.58966797,13 1.329,13 C1.06833203,13 0.84733424,12.9093342 0.666,12.728 C0.48466576,12.5466658 0.394,12.325668 0.394,12.065 L0.394,1.525 C0.394,1.26433203 0.48466576,1.04333424 0.666,0.862 C0.84733424,0.68066576 1.06833203,0.59 1.329,0.59 C1.58966797,0.59 1.81066576,0.68066576 1.992,0.862 C2.17333424,1.04333424 2.264,1.26433203 2.264,1.525 L2.264,5.503 C2.264,5.60500051 2.31499949,5.656 2.417,5.656 L7.381,5.656 C7.48300051,5.656 7.534,5.60500051 7.534,5.503 L7.534,1.525 C7.534,1.26433203 7.62466576,1.04333424 7.806,0.862 C7.98733424,0.68066576 8.20833203,0.59 8.469,0.59 C8.72966797,0.59 8.95066576,0.68066576 9.132,0.862 C9.31333424,1.04333424 9.404,1.26433203 9.404,1.525 L9.404,12.065 C9.404,12.325668 9.31333424,12.5466658 9.132,12.728 C8.95066576,12.9093342 8.72966797,13 8.469,13 C8.20833203,13 7.98733424,12.9093342 7.806,12.728 C7.62466576,12.5466658 7.534,12.325668 7.534,12.065 L7.534,7.271 C7.534,7.16899949 7.48300051,7.118 7.381,7.118 L2.417,7.118 C2.31499949,7.118 2.264,7.16899949 2.264,7.271 L2.264,12.065 C2.264,12.325668 2.17333424,12.5466658 1.992,12.728 Z M11.32,7.07 C11.1666659,7.07 11.0333339,7.0133339 10.92,6.9 C10.8066661,6.7866661 10.75,6.6533341 10.75,6.5 L10.75,6.27 C10.75,6.1166659 10.8066661,5.9833339 10.92,5.87 C11.0333339,5.7566661 11.1666659,5.7 11.32,5.7 L15.05,5.7 C15.2033341,5.7 15.3366661,5.7566661 15.45,5.87 C15.5633339,5.9833339 15.62,6.1166659 15.62,6.27 L15.62,6.5 C15.62,6.8800019 15.4733348,7.1899988 15.18,7.43 L13.67,8.68 L13.67,8.69 C13.67,8.6966667 13.6733333,8.7 13.68,8.7 L13.8,8.7 C14.3800029,8.7 14.8449983,8.8799982 15.195,9.24 C15.5450018,9.6000018 15.72,10.0866636 15.72,10.7 C15.72,11.4733372 15.4833357,12.0666646 15.01,12.48 C14.5366643,12.8933354 13.8566711,13.1 12.97,13.1 C12.436664,13.1 11.8966694,13.0366673 11.35,12.91 C11.1899992,12.8699998 11.0583339,12.7816674 10.955,12.645 C10.8516662,12.5083327 10.8,12.3533342 10.8,12.18 L10.8,11.84 C10.8,11.706666 10.8549995,11.6016671 10.965,11.525 C11.0750006,11.448333 11.196666,11.4299998 11.33,11.47 C11.9033362,11.6566676 12.4033312,11.75 12.83,11.75 C13.2166686,11.75 13.5166656,11.6600009 13.73,11.48 C13.9433344,11.2999991 14.05,11.0500016 14.05,10.73 C14.05,10.4033317 13.9266679,10.173334 13.68,10.04 C13.4333321,9.906666 12.9733367,9.8366667 12.3,9.83 C12.1466659,9.83 12.0133339,9.77500055 11.9,9.665 C11.7866661,9.55499945 11.73,9.4233341 11.73,9.27 L11.73,9.25 C11.73,8.8766648 11.8733319,8.5666679 12.16,8.32 L13.58,7.09 L13.58,7.08 C13.58,7.0733333 13.5766667,7.07 13.57,7.07 L11.32,7.07 Z" id="Shape" fill-rule="nonzero"></path>
            </g>
        </g>
    </svg>`

    d.consts.ICON_H4 = `
      <svg width="17px" height="12px" viewBox="0 0 17 12" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
          <g id="Page-1" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
              <g id="h3" fill="currentColor">
                  <path d="M1.992,12.728 C1.81066576,12.9093342 1.58966797,13 1.329,13 C1.06833203,13 0.84733424,12.9093342 0.666,12.728 C0.48466576,12.5466658 0.394,12.325668 0.394,12.065 L0.394,1.525 C0.394,1.26433203 0.48466576,1.04333424 0.666,0.862 C0.84733424,0.68066576 1.06833203,0.59 1.329,0.59 C1.58966797,0.59 1.81066576,0.68066576 1.992,0.862 C2.17333424,1.04333424 2.264,1.26433203 2.264,1.525 L2.264,5.503 C2.264,5.60500051 2.31499949,5.656 2.417,5.656 L7.381,5.656 C7.48300051,5.656 7.534,5.60500051 7.534,5.503 L7.534,1.525 C7.534,1.26433203 7.62466576,1.04333424 7.806,0.862 C7.98733424,0.68066576 8.20833203,0.59 8.469,0.59 C8.72966797,0.59 8.95066576,0.68066576 9.132,0.862 C9.31333424,1.04333424 9.404,1.26433203 9.404,1.525 L9.404,12.065 C9.404,12.325668 9.31333424,12.5466658 9.132,12.728 C8.95066576,12.9093342 8.72966797,13 8.469,13 C8.20833203,13 7.98733424,12.9093342 7.806,12.728 C7.62466576,12.5466658 7.534,12.325668 7.534,12.065 L7.534,7.271 C7.534,7.16899949 7.48300051,7.118 7.381,7.118 L2.417,7.118 C2.31499949,7.118 2.264,7.16899949 2.264,7.271 L2.264,12.065 C2.264,12.325668 2.17333424,12.5466658 1.992,12.728 Z M11.62,10.25 L11.62,10.26 C11.62,10.2666667 11.6233333,10.27 11.63,10.27 L13.28,10.27 C13.3400003,10.27 13.37,10.2433336 13.37,10.19 L13.37,7.77 C13.37,7.7633333 13.3666667,7.76 13.36,7.76 C13.3466666,7.76 13.34,7.7633333 13.34,7.77 L11.62,10.25 Z M10.68,11.6 C10.5266659,11.6 10.3950005,11.5433339 10.285,11.43 C10.1749995,11.3166661 10.12,11.1833341 10.12,11.03 L10.12,10.84 C10.12,10.4666648 10.2299989,10.1233349 10.45,9.81 L13.04,6.16 C13.2600011,5.8533318 13.5566648,5.7 13.93,5.7 L14.43,5.7 C14.5833341,5.7 14.7149994,5.7566661 14.825,5.87 C14.9350006,5.9833339 14.99,6.1166659 14.99,6.27 L14.99,10.19 C14.99,10.2433336 15.0199997,10.27 15.08,10.27 L15.48,10.27 C15.6333341,10.27 15.7666661,10.3266661 15.88,10.44 C15.9933339,10.5533339 16.05,10.6866659 16.05,10.84 L16.05,11.03 C16.05,11.1833341 15.9933339,11.3166661 15.88,11.43 C15.7666661,11.5433339 15.6333341,11.6 15.48,11.6 L15.08,11.6 C15.0199997,11.6 14.99,11.6299997 14.99,11.69 L14.99,12.43 C14.99,12.5833341 14.9350006,12.7166661 14.825,12.83 C14.7149994,12.9433339 14.5833341,13 14.43,13 L13.93,13 C13.7766659,13 13.6450005,12.9433339 13.535,12.83 C13.4249995,12.7166661 13.37,12.5833341 13.37,12.43 L13.37,11.69 C13.37,11.6299997 13.3400003,11.6 13.28,11.6 L10.68,11.6 Z" id="Shape" fill-rule="nonzero"></path>
              </g>
          </g>
      </svg>`


    d.consts.ALL_FONTS = new Set(['', 'abeezee', 'abril-fatface', 'alegreya', 'archivo', 'arial', 'arvo', 'biorhyme', 'b612', 'cairo', 'cardo', 'concert-one', 'cormorant', 'cousine', 'crimson-text', 'droid-sans', 'droid-serif', 'eb-garamond', 'exo-2', 'fira-sans', 'fjalla-one', 'frank-ruhl-libre', 'karla', 'ibm-plex', 'lato', 'lora', 'merriweather', 'mizra', 'monospace', 'montserrat', 'muli', 'noto-sans', 'nunito', 'old-standard-tt', 'open-sans', 'oswald', 'oxygen', 'playfair-display', 'pt-sans', 'pt-serif', 'poppins', 'rakkas', 'raleway', 'roboto', 'rubik', 'serif', 'source-sans', 'source-sans-pro', 'spectral', 'times-new-roman', 'tinos', 'titillium', 'ubuntu','varela','volkorn','work-sans','yatra-one'])

    d.helpers = {}
    d.helpers.kebab_to_title_case = (string) => string
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')

    // Simplified form of lodash.isEqual which does not do circular reference checks (since those are disallowed with deltas)
    // Because deltas are a simplified shallow object, the code here does not perform as many types of checks and may return
    // two objects as being different when lodash.isEqual would call them equal
    d.helpers.deltaIsEqual = (lhs, rhs) => {
      if (lhs === rhs) {
        return true
      }

      if(lhs === null || lhs === undefined || rhs === null || rhs === undefined) {
        return lhs === rhs
      }

      let lhs_is_array = Array.isArray(lhs)
      let rhs_is_array = Array.isArray(rhs)

      // Minor performance improvement - for arrays, toString attempts to print out every single element of the
      // array, making the call to toString and the tag check slightly redundant (we do that again in the if block)
      let lhs_tag = '[object Array]'
      if(!lhs_is_array) {
        lhs_tag = toString.call(lhs)
      }

      let rhs_tag = '[object Array]'
      if(!rhs_is_array) {
        rhs_tag = toString.call(rhs)
      }

      if(lhs_tag !== rhs_tag) {
        return false
      }

      // At this point anything referring to the left or right tag refers to the other tag

      if(lhs_is_array) {
        let lhs_len = lhs.length
        let rhs_len = rhs.length

        if(lhs_len !== rhs_len) {
          return false
        }

        for(let i = 0; i < lhs_len; i++) {
          if(!d.helpers.deltaIsEqual(lhs[i], rhs[i])) {
            return false
          }
        }

        return true
      }

      if(lhs_tag === '[object Object]') {
        let lhs_props = Object.keys(lhs)
        let rhs_props = Object.keys(rhs)

        if(lhs_props.length !== rhs_props.length) {
          return false
        }

        for(let i = 0; i < lhs_props.length; i++) {
          let prop = lhs_props[i]
          if(!Object.prototype.hasOwnProperty.call(rhs, prop)) {
            // Don't treat explicit null and missing the same
            return false
          }

          let lhs_val = lhs[prop]
          let rhs_val = rhs[prop]

          if(!d.helpers.deltaIsEqual(lhs_val, rhs_val)) {
            return false
          }
        }

        return true
      }

      switch(lhs_tag) {
        case '[object Boolean]':
        case '[object Date]':
        case '[object Number]':
          // Force lhs and rhs to be of the same type
          let casted_lhs = +lhs
          let casted_rhs = +rhs
          return casted_lhs === casted_rhs || (casted_lhs !== casted_lhs && casted_rhs !== casted_rhs)

        case '[object RegExp]':
        case '[object String]':
          return (lhs + '') === (rhs + '')

        case '[object Map]':
        case '[object Set]':
        case '[object Error]':
        case '[object DataView]':
        case '[object ArrayBuffer]':
          // These are all cases that the original lodash.isEqual implementation would have checked for equality
          // But which we do not since they do not show up in Deltas, for simplicity
          return false // explicitly, for clarity
      }

      return false
    }

    // Sans serif is already registered by default, so we replace it with an empty string in the fonts list
    d.consts.HTML_TO_BBCODE_FONTS = {}
    d.consts.BBCODE_TO_HTML_FONTS = {}
    for (const font_name of d.consts.ALL_FONTS) {
        const bbcode_translation = d.helpers.kebab_to_title_case(font_name)
        d.consts.HTML_TO_BBCODE_FONTS[font_name] = bbcode_translation
        d.consts.BBCODE_TO_HTML_FONTS[bbcode_translation] = font_name
    }

    // === initialize state ===
    // Quill instance itself is initialized in the update function
    d.initialized = false
    d.img_tracker = 0
    d.should_rerun_val = false
    d.prev_contents = ""
    d.initial_bbcode = ""
    d.initial_html = ""
    // last_change_source designates the actual source of the last change in content.
    // Quill indicates the source of a change either by 'user' or 'api'. It is mostly as we'd understand it, at the exception
    // that a programmatic change from the update function is considered also 'user', even though the user has not precisely
    // interacted with the editor.
    // We thus use last_change_source to clarify this situation. User actions result in user source, and
    // changes coming from Bubble (via autobinding for example) is listed as 'api'
    d.last_change_source = 'api'
    d.has_been_edited = false
    d.typing_timer_id = null

    instance.canvas.css("overflow", "visible")

    instance.publishState("field_is_focused", false)

    // === Initialize clipboard ===

    // Hack the clipboard to bypass the annoying re-focus
    // which centers the top of the Quill container after paste
    const Clipboard = Quill.import('modules/clipboard')
    class ForceScrollClipboard extends Clipboard {
        onPaste(e) {
            d.pasted = true
            const scrollTop = window.scrollY
            const scrollLeft = window.scrollX
            Clipboard.prototype.onPaste.call(this, e)
            // Shitty hack because the bad focus from above happens on a setTimeout too
            setTimeout(() => window.scrollTo(scrollLeft, scrollTop), 1)
        }
    }
    Quill.register('modules/clipboard', ForceScrollClipboard, true)
}
