function(instance, properties) {

    //custom preview that changes as various properties are changed
    //uses images rather than initializing a disabled Quill instance because the images are lighter weight and makes loading the element more efficient in the editor 
    
    var preview;
    var preview_images = {
        "basic_styles": "//dd7tel2830j4w.cloudfront.net/f1643984343641x732773842192692100/basic_styles.png",
        "basic_text_alignment": "//dd7tel2830j4w.cloudfront.net/f1643984360369x588624056575108200/basic_align.png",
        "font": "//dd7tel2830j4w.cloudfront.net/f1643984384340x492387405990395200/font.png",
        "size": "//dd7tel2830j4w.cloudfront.net/f1643984397648x478329821560685700/size.png",
        "text_styles": "//dd7tel2830j4w.cloudfront.net/f1643984417628x516210413050888000/text_styles.png",
        "text_color": "//dd7tel2830j4w.cloudfront.net/f1644040308364x347451774225640640/text_color.png",
        "sup_sub": "//dd7tel2830j4w.cloudfront.net/f1643984445693x110807684953927230/sup_sub.png",
        "titles_quote_code": "//dd7tel2830j4w.cloudfront.net/f1643984465420x846446158345320800/titles_quote_code.png",
        "media": "//dd7tel2830j4w.cloudfront.net/f1643984480106x393650961798107460/media.png",
        "remove_style": "//dd7tel2830j4w.cloudfront.net/f1643984503583x162484520361852800/remove_style.png",
        "list": "//dd7tel2830j4w.cloudfront.net/f1643984559961x324562868331102140/list.png",
        "indent_align": "//dd7tel2830j4w.cloudfront.net/f1643984590525x337688004196649200/indent_align.png",
        "all_titles": "//dd7tel2830j4w.cloudfront.net/f1643984627362x491667932453776700/all%20titles.png",
        "code_quotes": "//dd7tel2830j4w.cloudfront.net/f1643984671620x474698865852986940/code%20quotes.png",
        "medium_format": "//dd7tel2830j4w.cloudfront.net/f1643984656442x432037356441919550/medium%20formats.png"
    };
    
    
    if(properties.theme == "Regular"){
        var toolbar = "<div><div style='background-color:white;'>";
        if(properties.complexity == "Full"){
            toolbar += "<img src='"+ preview_images["font"] +"'>";
            toolbar += "<img src='"+ preview_images["size"] +"'>";
            toolbar += "<img src='"+ preview_images["text_styles"] +"'>";
            toolbar += "<img src='"+ preview_images["text_color"] +"'>";
            toolbar += "<img src='"+ preview_images["sup_sub"] +"'>";
            toolbar += "<img src='"+ preview_images["all_titles"] +"'>";
            toolbar += "<img src='"+ preview_images["code_quotes"] +"'>";
            toolbar += "<img src='"+ preview_images["list"] +"'>";
            toolbar += "<img src='"+ preview_images["indent_align"] +"'>";
            toolbar += "<img src='"+ preview_images["media"] +"'>";
            toolbar += "<img src='"+ preview_images["remove_style"] +"'>";
        } else if(properties.complexity == "Medium"){
            toolbar += "<img src='"+ preview_images["font"] +"'>";
            toolbar += "<img src='"+ preview_images["text_styles"] +"'>";
            toolbar += "<img src='"+ preview_images["text_color"] +"'>";
            toolbar += "<img src='"+ preview_images["all_titles"] +"'>";
            toolbar += "<img src='"+ preview_images["list"] +"'>";
            toolbar += "<img src='"+ preview_images["medium_format"] +"'>";
        } else {
            toolbar += "<img src='"+ preview_images["basic_styles"] +"'>";
            toolbar += "<img src='"+ preview_images["basic_text_alignment"] +"'>";
        }
        toolbar += "</div>";
        if(properties.initial_content && properties.initial_content!=""){
            toolbar += "<span style='margin:15px;font-family:sans-serif;font-size:13px;line-height:40px;'>" + properties.initial_content + "</span>";
        } else {
            if(properties.placeholder){
                toolbar += "<span style='font-style:italic;margin:15px;font-family:sans-serif;color:#737373;font-size:13px;line-height:40px;'>" + properties.placeholder + "</span>";
            }
        }
        toolbar += "</div>";
        preview = $(toolbar);
    } else {
		var editor = "<div>";
        if(properties.initial_content && properties.initial_content!=""){
            editor += "<span style='margin:15px;font-family:sans-serif;font-size:13px;line-height:40px;'>" + properties.initial_content + "</span>";
        } else {
            if(properties.placeholder){
                editor += "<span style='font-style:italic;margin:15px;font-family:sans-serif;color:#737373;font-size:13px;line-height:40px;'>" + properties.placeholder + "</span>";
            }
        }
        editor += "</div>";
        preview = $(editor);
    }

    preview.css("height", (properties.bubble.height() - 2) + "px");
    if(properties.bubble.border_style()=='none'){
        preview.children('div').css("border", "1px solid #cbcbcb");  
    } else {
        preview.children('div').css("border-bottom", "1px solid #cbcbcb");
    }
    preview.children('div').css("padding-right", "10px");
    preview.children('div').children('img').css("height", "38px");
	
    instance.canvas.append(preview);
    
}