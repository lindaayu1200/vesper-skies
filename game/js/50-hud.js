/* WINDWARD — flight HUD, compass, minimap, mission panel */
(function () {
  'use strict';
  var WW = window.WW, U = WW.U;

  function Hud(terrain, audio) {
    this.terrain = terrain;
    this.audio = audio;
    this.el = {};
    var ids = ['hud', 'compassCanvas', 'hdgNum', 'spd', 'alt', 'agl', 'vs', 'gmeter', 'attitude',
      'thrBar', 'thrNum', 'fuelBar', 'fuelNum', 'hullBar', 'hullNum', 'gearInd', 'flapInd',
      'boostInd', 'camInd', 'missionPanel', 'missionTime', 'missionTitle', 'missionObj',
      'missionSub', 'ringProgress', 'radioLines', 'minimap', 'mmTag', 'objArrow', 'objText',
      'warn', 'hintBar', 'fps'];
    for (var i = 0; i < ids.length; i++) this.el[ids[i]] = document.getElementById(ids[i]);
    this.compass = this.el.compassCanvas.getContext('2d');
    this.att = this.el.attitude.getContext('2d');
    this.map = this.el.minimap.getContext('2d');
    this.baseMap = terrain.buildMinimap(200);
    this.acc = 0;
    this.mapAcc = 0;
    this.radioMsgs = [];
    this.lastObjKey = '';
    this.lastWarn = '';
    this.tick = 0;
    this.el.hintBar.innerHTML = '<b>C</b> VIEW &nbsp; <b>G</b> GEAR &nbsp; <b>V</b> FLAPS &nbsp; <b>R/F</b> THROTTLE &nbsp; <b>SPACE</b> BOOST &nbsp; <b>P</b> PAUSE';
  }

  Hud.prototype.show = function (on) {
    this.el.hud.classList.toggle('hidden', !on);
  };

  Hud.prototype.setMission = function (def) {
    this.def = def;
    this.el.missionTitle.textContent = def.name;
    this.el.missionSub.textContent = def.sub;
    this.lastObjKey = '';
    this.radioMsgs = [];
    this.el.radioLines.innerHTML = '';
  };

  Hud.prototype.radio = function (text, who) {
    this.radioMsgs.push({ text: text, who: who || 'SOLMERE', t: 0 });
    if (this.radioMsgs.length > 3) this.radioMsgs.shift();
  };

  Hud.prototype.renderRadio = function () {
    var html = '';
    for (var i = 0; i < this.radioMsgs.length; i++) {
      var m = this.radioMsgs[i];
      html += '<div><span class="who">' + m.who + ':</span> ' + m.text + '</div>';
    }
    this.el.radioLines.innerHTML = html;
  };

  Hud.prototype.update = function (dt, ac, runner, opts) {
    this.tick = (this.tick + 1) % 1000;
    for (var i = 0; i < this.radioMsgs.length; i++) this.radioMsgs[i].t += dt;

    this.acc += dt;
    var slow = this.acc > 0.08;
    this.mapAcc += dt;
    var mapNow = this.mapAcc > 0.05;

    var kts = ac.speed * U.msToKts;
    var altFt = ac.pos.y * U.mToFt;
    var aglFt = Math.max(0, ac.agl) * U.mToFt;

    if (slow) {
      this.acc = 0;
      this.el.spd.textContent = Math.round(kts);
      this.el.alt.textContent = Math.round(altFt);
      this.el.agl.textContent = Math.round(aglFt);
      var vsFpm = (ac.velY || 0) * U.mToFt * 60;
      this.el.vs.textContent = (vsFpm > 0 ? '+' : '') + Math.round(vsFpm / 10) * 10;
      this.el.gmeter.textContent = ac.gLoad.toFixed(1);
      this.el.hdgNum.textContent = U.pad3(ac.heading());
      var thrPct = Math.round(ac.throttle * 100);
      this.el.thrBar.style.width = thrPct + '%';
      this.el.thrNum.textContent = thrPct + '%';
      var fuelPct = Math.round(ac.fuel * 100);
      this.el.fuelBar.style.width = fuelPct + '%';
      this.el.fuelNum.textContent = fuelPct + '%';
      this.el.fuelBar.style.background = fuelPct < 20 ? 'linear-gradient(90deg,#b8382a,#ff7a5a)' : 'linear-gradient(90deg,#c98f3f,#ffd98a)';
      var hullPct = Math.round(100 - ac.damage);
      this.el.hullBar.style.width = hullPct + '%';
      this.el.hullNum.textContent = hullPct + '%';
      this.el.gearInd.className = 'chip' + (ac.gearDown > 0.5 ? ' on' : '');
      this.el.flapInd.className = 'chip' + (ac.flaps > 0.5 ? ' flap' : '');
      this.el.boostInd.className = 'chip' + (ac.boost > 0.05 ? ' warnOn' : '');
      this.el.camInd.textContent = opts.view === 'cockpit' ? 'COCKPIT' : 'CHASE';
      this.el.camInd.className = 'chip on';

      /* mission panel */
      if (runner && runner.def) {
        var st = runner.stage;
        var key = st + ':' + runner.ringsPassed + ':' + runner.def.id + ':' + (runner.def.limit > 0);
        if (key !== this.lastObjKey) {
          this.lastObjKey = key;
          var html = '';
          for (var s = 0; s < runner.def.stages.length; s++) {
            var sd = runner.def.stages[s];
            var cls = s < st ? 'done' : (s === st ? 'now' : '');
            var txt = sd.text;
            if (sd.type === 'rings' && s === st) {
              var stageCount = sd.rings.length;
              var done = 0;
              for (var ri = runner.ringStageStart; ri < runner.ringStageEnd; ri++) if (runner.ringsPassed && runner.rings[ri] && runner.rings[ri].passed) done++;
              txt = sd.text + ' (' + done + '/' + stageCount + ')';
            }
            html += '<span class="step ' + cls + '">' + (s < st ? '✓ ' : (s === st ? '› ' : '· ')) + txt + '</span>';
          }
          this.el.missionObj.innerHTML = html;
        }
        this.el.missionTime.textContent = U.fmtTime(runner.time);
        this.el.missionTime.style.color = (runner.def.limit && runner.def.limit - runner.time < 30) ? '#ff8a6a' : '';
        this.el.ringProgress.textContent = 'GATES ' + runner.ringsPassed + '/' + runner.ringCount;
      }

      this.renderRadio();
      if (this.tick % 4 === 0) this.renderRadio();
    }

    /* warnings */
    var warn = '';
    if (ac.warn) {
      if (ac.crashed) warn = 'AIRFRAME LOST';
      else if (ac.warn.stall) warn = 'STALL';
      else if (ac.warn.pullUp) warn = 'PULL UP';
      else if (ac.warn.gear) warn = 'GEAR';
      else if (ac.warn.damage) warn = 'STRUCTURAL DAMAGE';
      else if (ac.warn.overspeed) warn = 'OVERSPEED';
      else if (ac.warn.fuel) warn = 'LOW FUEL';
    }
    if (warn !== this.lastWarn) {
      this.lastWarn = warn;
      this.el.warn.innerHTML = warn ? warn : '';
    }

    if (slow) {
      this.drawCompass(ac.heading());
      this.drawAttitude(ac);
    }
    if (mapNow) {
      this.mapAcc = 0;
      this.drawMinimap(ac, runner);
    }
    this.updateObjective(ac, runner);
  };

  Hud.prototype.updateObjective = function (ac, runner) {
    if (!runner || !runner.def) { this.el.objText.textContent = ''; return; }
    var t = runner.target(ac);
    if (!t) {
      this.el.objArrow.style.opacity = '0';
      this.el.objText.textContent = '';
      return;
    }
    var brg = U.bearingTo(ac.pos.x, ac.pos.z, t.pos.x, t.pos.z);
    var rel = U.angleDelta(ac.heading(), brg);
    this.el.objArrow.style.opacity = '0.92';
    this.el.objArrow.style.transform = 'rotate(' + rel.toFixed(0) + 'deg)';
    var d = t.dist;
    var distTxt = d > 1000 ? (d / 1000).toFixed(1) + ' km' : Math.round(d) + ' m';
    this.el.objText.textContent = t.label + ' · ' + distTxt;
  };

  Hud.prototype.drawCompass = function (hdg) {
    var c = this.compass, W = 720, H = 92;
    c.clearRect(0, 0, W, H);
    var grad = c.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, 'rgba(6,12,15,0.0)');
    grad.addColorStop(0.35, 'rgba(6,12,15,0.55)');
    grad.addColorStop(1, 'rgba(6,12,15,0.0)');
    c.fillStyle = grad;
    c.fillRect(0, 0, W, H);

    var ppd = 7.2;
    var center = W / 2;
    var start = Math.floor((hdg - 50) / 5) * 5;
    for (var d = start; d <= hdg + 50; d += 5) {
      var x = center + U.angleDelta(hdg, d) * ppd;
      if (x < -20 || x > W + 20) continue;
      var norm = U.wrap360(d);
      var major = Math.abs(norm % 30) < 0.01;
      var mid = Math.abs(norm % 10) < 0.01;
      var alpha = 1 - Math.min(1, Math.abs(x - center) / (W * 0.52));
      alpha = Math.max(0.15, alpha);
      c.strokeStyle = 'rgba(255,226,180,' + (alpha * (major ? 0.9 : 0.5)) + ')';
      c.lineWidth = major ? 1.8 : 1;
      c.beginPath();
      c.moveTo(x, H - 12);
      c.lineTo(x, H - 12 - (major ? 20 : (mid ? 12 : 7)));
      c.stroke();
      if (major) {
        var lbl = U.wrap360(Math.round(norm / 10) * 10);
        var names = { 0: 'N', 90: 'E', 180: 'S', 270: 'W' };
        c.fillStyle = 'rgba(255,238,206,' + alpha + ')';
        c.font = (names[lbl] ? '700 20px ' : '500 15px ') + 'Helvetica, Arial, sans-serif';
        c.textAlign = 'center';
        c.fillText(names[lbl] || U.pad3(lbl), x, H - 40);
      }
    }
    /* bug */
    c.fillStyle = '#ffbe5c';
    c.beginPath();
    c.moveTo(center, H - 2);
    c.lineTo(center - 7, H - 14);
    c.lineTo(center + 7, H - 14);
    c.closePath();
    c.fill();
    c.strokeStyle = 'rgba(255,190,92,0.55)';
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(center, H - 16);
    c.lineTo(center, 12);
    c.stroke();
    /* tick marks under */
    c.strokeStyle = 'rgba(255,214,150,0.25)';
    c.beginPath();
    c.moveTo(0, H - 10.5);
    c.lineTo(W, H - 10.5);
    c.stroke();
  };

  Hud.prototype.drawAttitude = function (ac) {
    var c = this.att, S = 132, R = 64;
    c.clearRect(0, 0, S, S);
    c.save();
    c.beginPath();
    c.arc(S / 2, S / 2, R, 0, Math.PI * 2);
    c.clip();
    c.fillStyle = '#1b4a63';
    c.fillRect(0, 0, S, S);
    c.save();
    c.translate(S / 2, S / 2);
    c.rotate(-ac.bankAngle() * U.DEG);
    var pitch = ac.pitchAngle();
    var offset = U.clamp(pitch, -60, 60) * 1.05;
    c.translate(0, offset * 1.15);
    c.fillStyle = '#6f5a3c';
    c.fillRect(-120, 0, 240, 200);
    c.strokeStyle = 'rgba(255,240,210,0.85)';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(-120, 0);
    c.lineTo(120, 0);
    c.stroke();
    c.font = '9px monospace';
    c.fillStyle = 'rgba(255,240,210,0.7)';
    c.textAlign = 'center';
    for (var p = -40; p <= 40; p += 10) {
      if (p === 0) continue;
      var y = -p * 1.15 * 1.02;
      var w = p % 20 === 0 ? 26 : 14;
      c.beginPath();
      c.moveTo(-w, y);
      c.lineTo(w, y);
      c.strokeStyle = 'rgba(255,240,210,0.6)';
      c.lineWidth = 1.4;
      c.stroke();
    }
    c.restore();
    c.restore();
    /* fixed aircraft symbol */
    c.strokeStyle = '#ffbe5c';
    c.lineWidth = 2.4;
    c.beginPath();
    c.moveTo(S / 2 - 24, S / 2);
    c.lineTo(S / 2 - 8, S / 2);
    c.moveTo(S / 2 + 8, S / 2);
    c.lineTo(S / 2 + 24, S / 2);
    c.moveTo(S / 2, S / 2 - 6);
    c.lineTo(S / 2, S / 2 + 4);
    c.stroke();
    c.beginPath();
    c.arc(S / 2, S / 2, R - 1, 0, Math.PI * 2);
    c.strokeStyle = 'rgba(255,214,150,0.5)';
    c.lineWidth = 1.5;
    c.stroke();
  };

  Hud.prototype.drawMinimap = function (ac, runner) {
    var c = this.map, S = 420;
    c.clearRect(0, 0, S, S);
    c.drawImage(this.baseMap, 0, 0, S, S);
    c.fillStyle = 'rgba(6,16,22,0.22)';
    c.fillRect(0, 0, S, S);

    /* grid */
    c.strokeStyle = 'rgba(255,220,170,0.08)';
    c.lineWidth = 1;
    for (var g = 0; g <= 4; g++) {
      var p = (g / 4) * S;
      c.beginPath(); c.moveTo(p, 0); c.lineTo(p, S); c.stroke();
      c.beginPath(); c.moveTo(0, p); c.lineTo(S, p); c.stroke();
    }

    if (runner) {
      var rings = runner.mapRings();
      for (var i = 0; i < rings.length; i++) {
        var mp = this.terrain.worldToMap(rings[i].x, rings[i].z, S);
        c.beginPath();
        if (rings[i].reach) {
          c.arc(mp.x, mp.y, 6, 0, 6.3);
          c.strokeStyle = 'rgba(120,230,200,0.9)';
          c.lineWidth = 2;
          c.stroke();
        } else {
          c.arc(mp.x, mp.y, rings[i].passed ? 3 : 4.5, 0, 6.3);
          c.fillStyle = rings[i].passed ? 'rgba(120,220,150,0.8)' : 'rgba(255,190,95,0.95)';
          c.fill();
        }
      }
      var t = runner.target(ac);
      if (t) {
        var tp = this.terrain.worldToMap(t.pos.x, t.pos.z, S);
        var ap = this.terrain.worldToMap(ac.pos.x, ac.pos.z, S);
        c.strokeStyle = 'rgba(255,190,95,0.35)';
        c.lineWidth = 1.2;
        c.setLineDash([4, 5]);
        c.beginPath();
        c.moveTo(ap.x, ap.y);
        c.lineTo(tp.x, tp.y);
        c.stroke();
        c.setLineDash([]);
      }
    }

    /* plane */
    var pp = this.terrain.worldToMap(ac.pos.x, ac.pos.z, S);
    c.save();
    c.translate(pp.x, pp.y);
    c.rotate(ac.heading() * U.DEG);
    c.fillStyle = '#fff3da';
    c.strokeStyle = 'rgba(0,0,0,0.55)';
    c.lineWidth = 1.4;
    c.beginPath();
    c.moveTo(0, -10);
    c.lineTo(7, 8);
    c.lineTo(0, 4);
    c.lineTo(-7, 8);
    c.closePath();
    c.fill();
    c.stroke();
    c.restore();

    /* aircraft trail dot */
    c.beginPath();
    c.arc(pp.x, pp.y, 13, 0, 6.3);
    c.strokeStyle = 'rgba(255,190,95,0.35)';
    c.lineWidth = 1;
    c.stroke();

    /* border */
    c.strokeStyle = 'rgba(255,214,150,0.35)';
    c.lineWidth = 2;
    c.strokeRect(1, 1, S - 2, S - 2);
  };

  Hud.prototype.setFps = function (v) {
    this.el.fps.textContent = v;
  };

  WW.Hud = Hud;
})();
