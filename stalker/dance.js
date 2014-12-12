function draw_circle(bbox, path, start, angle) {
  var center_x = bbox.cx
  var center_y = bbox.cy
  var radius = bbox.r0 + 2;
  var point = find_xy_point(center_x, center_y, radius, angle)
  var sweep = (angle%360 > 180) ? 1 : 0;
  var path_str = "M"+center_x+", "+center_y+" l"+radius+",0 A"+radius+","+radius+" 0 "+sweep+",1 "+point[0]+","+point[1]+" L"+center_x+", "+center_y;
  path.attr('d',path_str);
}

// remember that deg 0 is far right side of circle
function find_xy_point(cx, cy, radius, deg) {
  var x = cx + radius * Math.cos(Snap.rad(deg))
  var y = cy + radius * Math.sin(Snap.rad(deg))
  return [x, y];
}
function build_path(center_point, radius, sweep_large, sweep_direction, end_point){ 
  return "M"+center_point[0]+","+center_point[1]+" A"+radius+","+radius+" 0 "+sweep_large+","+sweep_direction+" "+end_point[0]+","+end_point[1]
}

function generate_track_tracker(paper, icon, img_size, duration, text_title, text_details) {
  var pie = paper.path("M0,0").attr({
    'stroke-width': '5px',
    stroke: 'rgba(13, 83, 152, 1)',
    fill: 'rgba(13, 83, 152, 1)',
    'stroke-opacity': 0.5
  });
  var img = paper.image(icon,40,40,img_size,img_size);
  var bbox = img.getBBox();
  var start = new Date();
  var angle = 0;

  var radius_text =  bbox.r0 + 10
  var start_text = find_xy_point(bbox.cx, bbox.cy, radius_text, 100)
  var end_text = find_xy_point(bbox.cx, bbox.cy, radius_text, 80)
  var text_circle = paper.path(build_path(start_text, radius_text, 1, 1, end_text)).attr({
    fill: 'none',
    stroke: 'none'
  })
  var text_one = paper.text(0,0,text_title).attr({ class: 'track-title','text-anchor': 'middle' })
  text_one.attr({textpath: text_circle}).textPath.attr({'startOffset': '50%'});

  radius_text += 15
  start_text = find_xy_point(bbox.cx, bbox.cy, radius_text, 260)
  end_text = find_xy_point(bbox.cx, bbox.cy, radius_text, 280)
  text_circle = paper.path(build_path(start_text, radius_text, 1, 0, end_text)).attr({
    fill: 'none',
    stroke: 'none'
  })
  var text_one = paper.text(0,0, text_details).attr({ class: 'track-title','text-anchor': 'middle' });
  window.reb = text_one
  window.reb2 = text_circle
  text_one.attr({textpath: text_circle}).textPath.attr({'startOffset': '50%'});

  animationQueue.push(function() {
    var diff = (new Date().getTime() - start.getTime()) / (1000);
    angle = diff/duration * 360
    draw_circle(bbox, pie, start, angle);
  })
}



var s = Snap("#drawing")
var animationQueue = [];
generate_track_tracker(s, "album_artwork_small_2.jpg", 50, 90, "aaaa aaa a a a a a   a aaa a a aa", "bb b b b bb b b b bbb b b");
var go = true;



function animateThings() {
  _.each(animationQueue, function(node) {
    node.apply();
  })
  if (go)
    window.requestAnimationFrame(animateThings);
}
animateThings();