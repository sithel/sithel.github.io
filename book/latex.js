'use strict';

var latex_config = {};

// This needs to happen AFTER we match comments & highlighted text
function latex_scrub_str(text) {
  var orig_text = text;
  text = text.replace(/_/g, "\\_")
  text = text.replace(/#/g, "\\#")
  text = text.replace(/\[/g, "{[}")
  text = text.replace(/%/g, "\\%")
  text = text.replace(/&/g, "\\&")
  text = text.replace(/]/g, "{]}")

  text = text.replace(/’/g, "'")
  text = text.replace(/\u2018/g, "'")
  text = text.replace(/\u2019/g, "'")
  
  text = text.replace(/“/g, "``")
  text = text.replace(/\“/g, "``")
  text = text.replace(/\u201c/g, "``")

  text = text.replace(/”/g, "''")
  text = text.replace(/\”/g, "''")
  text = text.replace(/\"/g, "''")
  text = text.replace(/\u201d/g, "''")

  // I seem to frequently fuck up the " " situation...
  text = text.replace(/(\s)''(?!$)/g, "$1``")
  text = text.replace(/^''(?!$)/g, "``")

  text = text.replace(/\u2026/g, "...")

  text = text.replace(/</g, "\\textless ")
  text = text.replace(/>/g, "\\textgreater ")
  if (orig_text != text) {
    console.debug("we just scrubbed "+ text);
  }

  text = text.replace(/\u00A0/g, " ");
  return text;
}

// Oh yeah, lets chew through that HTML content and make it just the LaTeXy way we want it
function latexIt() {
  $('.status_step.load_c').addClass('done');
  $('.guts').html($('.doc_orig').html())
  var copy = $('.guts');
  latex_config.chapter_title = "";
  latex_config.chapter_count = 1;

  inject_footnote_pre_markup(copy);
  $('.status_step.pre_comments').addClass('done');
  scrub_all_content(copy);
  $('.status_step.scrub').addClass('done');

  console.log("we're checking the font/color for "+copy.find('span').length)
  copy.find('hr').each(function(i,x) {
    var el = $(x);
    el.after('<p><span style="font-size: 10px;">ADD_LINE_HERE</span></p>');
  });
  correct_span_markup(copy);
  $('.status_step.markup').addClass('done');
  correct_list_markup(copy);

  var result = ""
  console.log("going to pick up... "+copy.find('>p').length);
  copy.find('>p').each(function(i, x){
    var el = $(x)
    var text = el.text();
    result = result + text + "\n\n";
  })
  result = repair_pre_markups(result);

  // TODO : allow this to be enabled/disabled
  result = result.replace(/\n\\underline{\s*(\w[^\n]*)}\s*\n/g, "\\jumpHeadline{$1}\n\n")
  result = result.replace(/\n\\textbf{\s*(\w[^\n]*)}\s*\n/g, "\\sceneHeadline{$1}\n\n")
  // same as above, but allowing for highlights
  result = result.replace(/\n\\underline{\s*\\hl{\s*(\w[^\n]*)}\s*\n/g, "\\jumpHeadline{\\hl{$1}\n\n")
  result = result.replace(/\n\\textbf{\s*\\hl{\s*(\w[^\n]*)}\s*\n/g, "\\sceneHeadline{\\hl{$1}\n\n")

  $('.status_step.results').addClass('done');

  latex_config.latex_chapter = result;
  determine_output();
}
var latexItSafely = _.debounce(latexIt, 10000);


// We want the comments linked up and put into the document where they belong... but remember that we're going to scrub/escape
// all special characters AFTER this, so we can't actually mark up the footnotes LaTeX style yet, that'll all just get escaped
//
// We can't link up after scrubbing because then the strings don't match (obvious, don't hurt to state). The Comments API doesn't
// return marked up (in any way) content even if the content it's matching IS marked up in the text
function inject_footnote_pre_markup(copy){
  var com_i = 1;
  while (copy.find('[name=cmnt_ref'+com_i+']').length) {
    var ref_el = copy.find('[name=cmnt_ref'+com_i+']');
    // This here is the magic assumptions come in about how Google exports their comments in the HTML format
    // gotta' stick the different spans together with a \n in the case of multi-line comments...
    var footnote = _.map(copy.find('[name=cmnt'+com_i+']').parent().parent('div').find('span'), function(c) { 
      return $(c).text();
    }).join("\n");
    var possible_content = ref_el.parent().prev()
    var comment = find_comment(footnote, possible_content);
    if (comment) {
      console.log("rebecca, you rock!");
      footnote = mark_up_comment(footnote, comment);
      attempt_to_highlight(comment, ref_el, possible_content);
    } else {
      console.warn("no love for '"+footnote+"'");
      $('.problems').append("<li>Unable to find a matching comment for footnote: <span class='comment-in-question bad'>"+footnote+"</span>");
    }
    ref_el.parent().prepend(footnote);  // neither footnote nor orig content has been scrubbed yet
    ref_el.remove();
    ++com_i;
  }
}

// Manually scrubbing each tag type to ensure I know what's going on and to not accidentially pick up content I don't want. Kinda' silly, I know.
function scrub_all_content(copy) {
  copy.find('span').each(function(i, x) {
    var el = $(x);
    var text = $(x).text();
    el.text(latex_scrub_str(text));
  });
  copy.find('a').each(function(i, x) {
    var el = $(x);
    var text = $(x).text();
    el.text(latex_scrub_str(text));
  });
  copy.find('sup').each(function(i, x) {
    var el = $(x);
    var text = $(x).text();
    el.text(latex_scrub_str(text));
  });
}

// Looking at the CSS and wrapping the spans with the appropriate LaTeX markup
function correct_span_markup(copy) {
  copy.find('span').each(function(i, x) {
    var el = $(x);
    if (! el.text()) {
      // we don't care about your white space
      return;
    }
    var color_array = el.css('color').match(/rgb\((\d*), (\d*), (\d*)\)/);  // r = 1, g = 2, b = 3
    if (color_array && color_array[1] + color_array[2] + color_array[3] > 0) {
      var color_str = color_array[1]+","+color_array[2]+","+color_array[3];
      console.debug("just colored '"+el.text()+"'")
      el.text(" {\\color[RGB]{"+color_str+"}"+el.text()+"} ");
    }
    // TODO : for 4T consider converting the colors/marking them differently
    // since I might be printing in B&W

    if (el.css("font-weight") == "bold") {
      console.debug("just bolded '"+el.text()+"'")
      el.text("\\textbf{"+el.text()+"}");
    }
    if (el.css("font-style") == "italic") {
      console.debug("just italicized '"+el.text()+"'")
      el.text("\\textit{"+el.text()+"}");
    }
    var font_size_str = el.css('font-size');
    // TODO : what's up with the choice of 14 font size? Eh, random guess. Might want to fix/programatically check?
    if (font_size_str && parseInt(font_size_str.substring(0, font_size_str.length - 2)) > 14) {
      var s = el.text().toLowerCase();
      var size = parseInt(font_size_str.substring(0, font_size_str.length - 2))
      console.debug("making the text large because size is "+size+": "+el.text());
      // TODO : allow this to be customized maybe?
      if (s.indexOf('session') == -1 && !latex_config.chapter_title) {
        latex_config.chapter_title += el.text() +" ";
        el.remove();
      } else if (s.indexOf('session ') > -1 && latex_config.chapter_count == 1) {
        var s = 
        latex_config.chapter_count = parseInt(s.substr(s.indexOf("session")+"session ".length));
        el.remove();
      } else {
        el.text(" {\\LARGE "+el.text()+" } ");
      }
    }

    if (el.css('text-align') == "center") {
      el.text("\\begin{center}\n"+el.text()+"\n\\end{center}\n");
    }

    if (el.css('text-decoration') == "underline") {
      el.text("\\underline{ "+el.text()+" }");
    }
  });
}

function correct_list_markup(copy) {
  copy.find('ul,ol').each(function(i, x) {
    var el = $(x);
    var type = (el[0].tagName == 'OL') ? 'enumerate' : 'itemize';
    var s = "";
    el.find('li').each(function(j, y) {
      var el2 = $(y);
      s += "\\item "+el2.text()+"\n";
    });
    // we pick up only things in <p> tags for the results so we need to wrap this
    el.before("<p><span>\\begin{"+type+"}\n"+s+"\\end{"+type+"}</span></p>");
    el.remove();
  });
}

// This can be run repeatedly without expensive calculations
function determine_output() {
  var result = latex_config.latex_chapter;
  var option = $('.output-option:checked').val()
  if (option == "chap-only") {
    result = latex_config.latex_chapter;
  } else if (option == "both") {
    result =  $('.header').text() +
      "\n\n\n" + 
      "\\setcounter{chapter}{ "+ (latex_config.chapter_count - 1)+" }\n"+  //gotta -1 since the chapter commant auto-bumps it up!
      "\\chapter{"+ latex_config.chapter_title +"}\n"+ 
      result + "\n\n\n\n \\end{document}";
  } else if (option == "header-only") {
    result =  $('.header').text() + "\n\\end{document}";
  }
  latex_config.result = result;
  $('.latex').text(latex_config.result);
  $('.text-length').text(latex_config.result.length);
}



// {
// \textit{Notes:} Suko

// \parskip=0pt

// \textit{Date:} Dec 4th, 2014
// }


function find_comment(footnote, possible_content) {
  // TODO : doesn't handle the duplicate footnote issues
  // No scrubbing here because it happens PRE scrubbing
  var footnote = footnote.replace(/\u00A0/g, " ");
  console.log("Looking for footnote '"+footnote+"' --- ")
  return _.reduce(comments, function(memo, c) {
    if (memo) {
      return memo;
    }
    if (c.content == footnote) {
      return c;
      // console.log("  >> MATCHES!");
    }
    // console.log("  >> does NOT match '"+c.content+"'")
    return _.find(c.replies, function(r) {
      r.isReply = true;
      if (r.content == footnote) {
         return true;
         // console.log("    >>>> MATCHES!");
      } else {
        // console.log("    >>>> does NOT match reply '"+r.content+"'");
      }
      return r.content == footnote;
    });
  }, null);
}

function mark_up_comment(footnote, comment) {
  var date_formatted = moment(comment.createdDate).format('MM/DD/YY h:mma');  // "12/15/14 7:07pm"
  if (comment.isReply) {
    return "REBECCAxxBEGINxxFOOTNOTExxREPLYxx"+comment.author.displayName+"xxHERExxISxxTHExxFOOTNOTExx"+footnote+"xxHERExxISxxTHExxDATExx"+date_formatted+"xxENDxxFOOTNOTE";
  }
  return "REBECCAxxBEGINxxFOOTNOTExxBASICxx"+comment.author.displayName+"xxHERExxISxxTHExxFOOTNOTExx"+footnote+"xxHERExxISxxTHExxDATExx"+date_formatted+"xxENDxxFOOTNOTE";
}

function repair_pre_markups(result) {
  // using [\s\S] rather than . so that it'll pick up multi-line stuff
  var result = result.replace(/REBECCAxxBEGINxxFOOTNOTExxBASICxx([\s\S]*?)xxHERExxISxxTHExxFOOTNOTExx([\s\S]*?)xxHERExxISxxTHExxDATExx(.*?)xxENDxxFOOTNOTE/g, 
    "\\footnote{\\textbf{$1}$2\\textsubscript{$3}}");
  result = result.replace(/REBECCAxxBEGINxxFOOTNOTExxREPLYxx([\s\S]*?)xxHERExxISxxTHExxFOOTNOTExx([\s\S]*?)xxHERExxISxxTHExxDATExx(.*?)xxENDxxFOOTNOTE/g, 
    "\\footnote{$\\rightarrow$\\textbf{$1}$2\\textsubscript{$3}}");
  result = result.replace(/REBECCAxxBEGINxxHIGHLIGHTxx(.*?)xxENDxxHIGHLIGHT/g, 
    "\\hl{$1}");
  result = result.replace(/ADD_LINE_HERE/g,
    "\\noindent\\hrulefill");
  return result;
}

function attempt_to_highlight(comment, ref_el, possible_content) {
  if (!comment.context || !comment.context.value) {
    return;
  }
  // the Google Drive API's comments don't serve non breaking spaces like this
  var possible_content_text = possible_content.text().replace(/\u00A0/g, " ").trim();
  // undo the HTML escaping in the Google Drive API's comments content (want `á` for example, not `&#225;`)
  var comment_text = $('<span>'+comment.context.value+'</span>').text().trim();

  if (possible_content_text == comment_text) {
    possible_content.text("REBECCAxxBEGINxxHIGHLIGHTxx"+possible_content_text+"xxENDxxHIGHLIGHT");
  } else if (comment_text.indexOf(possible_content_text) > -1) {
    console.warn("I ALMOST mushed (but didn't) because I've got `"+possible_content_text+"` vs `"+comment_text+"`");
    var match_results = dangerously_grab_text(comment_text, possible_content_text, possible_content, possible_content);
    if (!match_results) {
      $('.problems').append("<li>Unable to highlight for footnote: <span class='comment-in-question'>"+comment.content+"</span>, unable to correctly match (exceeded acceptable limit):"+
      "<table class='comment-contrast'><tr><td>Expected</td></tr>"+
      "<tr><td class='comment-in-question good'>"+comment_text+"</td></tr></table>");
    }
  } else {
    console.warn("I didn't mush because I've got `"+possible_content_text+"` vs `"+comment_text+"`");
    $('.problems').append("<li>Unable to highlight for footnote: <span class='comment-in-question'>"+comment.content+"</span> because:"+
      "<table class='comment-contrast'><tr><td>Given</td><td>Expected</td></tr>"+
      "<tr><td class='comment-in-question bad'>"+possible_content_text+"</td><td class='comment-in-question good'>"+comment_text+"</td></tr></table>");
  }
}

function dangerously_grab_text(to_match, matched, currently_matched_el, start_el) {
  console.warn("dangerously_grab_text: Dude, we're inside `dangerously_grab_text` w/ "+to_match+", "+matched+", and currently at : "+currently_matched_el.text())
  var next_el = currently_matched_el.prev();
  if ( !next_el.length) {
    next_el = currently_matched_el.parent().prev().children().last();
    matched = "\n" + matched;
  } 
  matched = next_el.text() + matched;
  if (matched.replace(/(\s)/g, " ") == to_match.replace(/(\s)/g, " ")) {
    console.warn("dangerously_grab_text: awwww yiiiiis, managed an extended match!!!  -"+to_match+"- vs ="+matched+"=");
    start_el.text(start_el.text()+"xxENDxxHIGHLIGHT");
    next_el.text("REBECCAxxBEGINxxHIGHLIGHTxx"+next_el.text());
    return true;
  } else if (matched.length > 1000) {
    console.warn("dangerously_grab_text: bailing for the sake of safety... already 1000 char long... probably a failed match.  Currently at "+to_match+" vs "+matched);
    return false;
  } else {
    console.warn("dangerously_grab_text: Well... shit... we didn't match yet.  Hows -"+to_match+"- vs ="+matched+"= looking... ?");
    return dangerously_grab_text(to_match, matched, next_el, start_el);
  }
}

var loaded_latex_js = true;
