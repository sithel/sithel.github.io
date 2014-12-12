var reb = {
  find: function(key) {
    return _.find(reb.people, function(p) {
      return p.get('key') == key;
    });
  },
  bumpHistory: function(p) {
    if (_.isUndefined(p.history)) { p.history = []; }
    console.log(" ----> bumped history for "+p.get('firstName'));
    if (p.get('lastSongPlayTime') && p.get('lastSongPlayed')) {
      p.history.push({
        time: (p.history.length) ? new Date() : p.get('lastSongPlayTime'),
        track: p.get('lastSongPlayed'),
        key: p.get('lastSongPlayed').key
      });
    }
  },
  update: function(p){
    var key = p.get('key')
    if (!p.rebCreated){
     var s = [
       "<div class='person online-status-"+ p.get('online') +"' id='"+key+"'>",
       "Name: '"+p.get('firstName')+" "+p.get('lastName')+"' <i>("+key+")</i>",
       "<svg id='"+key+"_track' class='svg_track' width=130 height=130></svg>",
       "<div class='time'></div>",
       "<div class='source'></div>",
       "<div class='histories'></div>",
       "</div>"
      ].join('');
      p.rebCreated = $('#people').append(s);
      p.snap = Snap("#"+key+'_track')
    }
    var track = p.get('lastSongPlayed');
    var date = (p.history && p.history.length > 1) ? new Date() : p.get('lastSongPlayTime');
    var source = p.get('lastSourcePlayed');
    var history = [];
    var is_album = !source || source.type == 'a' || source.type == 'al';
    if (date && p.history && p.history.length > 1) {
      var temp_date = date;
      _.each(_.first(p.history, p.history.length - 1).reverse(), function(h, index) {
        var diff = moment(h.time).from(moment(temp_date), true)
        temp_date = h.time;
        var display_index = (is_album) ? h.track.trackNum : index;
        history.push("<div class='history'> "+ display_index +" : "+h.track.name+" by "+ h.track.artist +" from "+ h.track.album +"<img src='"+h.track.icon+"'> "+ diff+"</div>");
      });
    }
    p.rebCreated.find('.histories').html(history.join(''));
    if (!is_album) {
      p.rebCreated.find('source').html("Source type: "+source.type+" : "+source.name+" : <img class='source-icon' src='"+ source.icon +"'>");
    }
    if (date) {
      p.rebCreated.find('.time').html("Played "+ moment(date).fromNow() +" @ ("+ moment(date).format("ddd, MMM Do YYYY, h:mm:ss a") +")");
    }

    // var s =[
    //   "<div class='person online-status-"+ p.get('online') +"' id='"+key+"'>",
    //  "Name: '"+p.get('firstName')+" "+p.get('lastName')+"' <i>("+key+")</i>",
    //  (!track) ? "" : "<br>",
    //  (!track) ? "" : "Track: "+track.name+" by "+ track.artist +" from "+ track.album +"<svg id='"+key+"_track' class='svg_track' width=130 height=130></svg>",
    //  (!date) ? "" : "<br>",
    //  (!date) ? "" : ,
    //  (is_album) ? "" : "<br>",
    //  (is_album) ? '' : ,
    //  (!history) ? "" : "<br>",
    //  (!history) ? "" : history.join(''),
    //  "</div>"
    // ].join('');
    if (track)
      generate_track_tracker(p.snap, track.icon, 50, track.duration, track.name, track.album + " - by - " + track.artist);
    console.log(" -- update : "+key);
  },
  followReady: function() {
    console.log("Following is initialized: ", R.currentUser.get('following').models);
    reb.people = R.currentUser.get('following').models;
    _.each(reb.people, function(p, index){
      if (reb.legal_people.indexOf(p.get('key')) == -1)
        return;
      reb.update(p);
      console.warn(" warming up user '"+p.get('firstName')+"' ... ")
      p.debouncedBumpHistory = _.debounce(reb.bumpHistory, 500);
      p.debouncedUpdate = _.debounce(reb.update, 600);
      p.on('change:lastSongPlayed', function(x){
        console.warn("I just saw a 'lastSongPlayed' for '"+p.get('firstName')+"' : ", x);
        p.debouncedBumpHistory(p);
        p.debouncedUpdate(p);
      });
      p.on('change:lastSongPlayTime', function(x){
        console.warn("I just saw a 'lastSongPlayTime' for '"+p.get('firstName')+"' : ", x);
        p.debouncedBumpHistory(p);
        p.debouncedUpdate(p);
      });
      p.on('change:lastSourcePlayed', function(x){
        console.warn("I just saw a 'lastSourcePlayed' for '"+p.get('firstName')+"' : ", x);
        p.debouncedBumpHistory(p);
        p.debouncedUpdate(p);
      });
      p.on('change:online', function(x){
        console.warn("I just saw a 'online' for '"+p.get('firstName')+"' : ", x);
        p.debouncedUpdate(p);
      });
      p.trackField('lastSongPlayed');
      p.trackField('lastSongPlayTime');
      p.trackField('lastSourcePlayed');
      p.trackPresence()
    });
  },
  start: function() {
    console.log("Stuff started");
    if(reb.TRACKING) {
      R.currentUser.trackFollowing(reb.followReady);
    }
  },
  legal_people: [
    's4968885', //jose
    's12640989', //marek
    's17674804', //nate
    's1007728', //holly
    's1070', //devin
    's19733551', //joshua
    's1049470', //jesse
    's929197', //amie
    's4521143', //james
    's971822', //emily
    's4075', //gabe
    // 's5599765', //kelly
    // 's24216671', //mom
    // 's24214745', //lindsey
    's287244',  //adam
    's233', //brian f
    ''
  ],
  TRACKING: true
}
R.ready(reb.start)