import { BALLS, MAX_LEVEL, SPAWN_LEVELS } from './ballConfig';
import { MATTER_MIN } from './vendor/matterMin';

export interface GameHtmlOptions {
  /** canvas logical width in px */
  width?: number;
  /** canvas logical height in px */
  height?: number;
  /** level -> data URI; missing levels fall back to a colored circle */
  images?: Record<number, string>;
}

const WALL = 12;
const DROP_Y = 46;
const DANGER_Y = 96; // danger line near the top of the canvas

export function buildGameHtml(opts: GameHtmlOptions = {}): string {
  const width = opts.width ?? 360;
  const height = opts.height ?? 580;
  const config = {
    balls: BALLS,
    spawnLevels: SPAWN_LEVELS,
    maxLevel: MAX_LEVEL,
    width,
    height,
    wall: WALL,
    dropY: DROP_Y,
    dangerY: DANGER_Y,
    images: opts.images ?? {},
  };

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<style>
  html,body{margin:0;padding:0;background:#FDF6E3;overflow:hidden;
    -webkit-user-select:none;user-select:none;-webkit-touch-callout:none;touch-action:none;}
  #c{display:block;margin:0 auto;touch-action:none;}
</style>
</head>
<body>
<canvas id="c"></canvas>
<script>${MATTER_MIN}</script>
<script>
(function(){
  var CFG = ${JSON.stringify(config)};
  var M = Matter;
  var canvas = document.getElementById('c');
  var ctx = canvas.getContext('2d');
  var dpr = window.devicePixelRatio || 1;
  canvas.style.width = CFG.width + 'px';
  canvas.style.height = CFG.height + 'px';
  canvas.width = Math.floor(CFG.width * dpr);
  canvas.height = Math.floor(CFG.height * dpr);
  ctx.scale(dpr, dpr);

  // ---- preload images (fallback to colored circle if absent) ----
  var imgs = {};
  Object.keys(CFG.images).forEach(function(k){
    var im = new Image(); im.src = CFG.images[k]; imgs[k] = im;
  });

  // ---- bridge ----
  function send(msg){
    var s = JSON.stringify(msg);
    if (window.ReactNativeWebView) { window.ReactNativeWebView.postMessage(s); }
    else if (window.parent) { window.parent.postMessage(s, '*'); }
  }

  // ---- engine ----
  var engine = M.Engine.create();
  engine.gravity.y = 0.85; // base falling speed (15% slower than the original 1.0)
  var world = engine.world;
  var runner = M.Runner.create();
  M.Runner.run(runner, engine);

  var w = CFG.width, h = CFG.height;
  var inset = 0;             // walls/floor sit at the true canvas edges so balls
  var floorTop = h - inset;  // rest touching the boundary (frame is drawn around it)
  var opts = { isStatic:true, render:{visible:false} };
  // Matter uses max(restitutionA, restitutionB) for a pair, so a bouncy floor
  // makes ball->floor hits bounce a lot while ball->ball (both low) stays soft.
  var floorOpts = { isStatic:true, render:{visible:false}, restitution: 0.15, label: 'floor' };
  var wt = 80; // thick walls/floor so fast balls in a busy pile can't tunnel out
  M.Composite.add(world, [
    M.Bodies.rectangle(w/2, floorTop + wt/2, w, wt, floorOpts),       // floor: top surface at floorTop
    M.Bodies.rectangle(inset - wt/2, h/2, wt, h*2, opts),             // left: inner surface at x=inset
    M.Bodies.rectangle(w - inset + wt/2, h/2, wt, h*2, opts),         // right: inner surface at x=w-inset
  ]);

  function ballDef(level){ return CFG.balls[level]; }

  // ---- falling balls speed up as they near the bottom ----
  // Extra downward accel scales with depth (0 at top -> +60% at the floor),
  // applied only to bodies actually moving down so resting stacks stay stable.
  M.Events.on(engine, 'beforeUpdate', function(){
    var bodies = M.Composite.allBodies(world);
    for (var i=0;i<bodies.length;i++){
      var b = bodies[i];
      if (b.isStatic || !b.plugin || b.velocity.y <= 0.2) continue;
      var depth = Math.min(1, Math.max(0, b.position.y / CFG.height));
      var extra = engine.gravity.y * 0.6 * depth;
      b.force.y += b.mass * extra * engine.gravity.scale;
    }
  });

  var rng = Math.random; // declared before pickSpawn()'s first call below
  var current = pickSpawn();
  var next = pickSpawn();
  var previewX = w/2;
  var canDrop = true;
  var overSince = {}; // bodyId -> timestamp first seen above danger line
  var gameOver = false;
  var popScale = {}; // bodyId -> spawn animation progress 0..1

  function pickSpawn(){
    // Weighted toward smaller fruits: weight = (count - index), so the smallest
    // is most likely and the largest spawnable is least. For [0,1,2,3,4] the
    // weights are 5:4:3:2:1 -> ~33%, 27%, 20%, 13%, 7%.
    var n = CFG.spawnLevels.length, total = 0, i;
    for (i=0;i<n;i++) total += (n - i);
    var roll = rng() * total;
    for (i=0;i<n;i++){
      roll -= (n - i);
      if (roll < 0) return CFG.spawnLevels[i];
    }
    return CFG.spawnLevels[n-1];
  }

  function makeBall(level, x, y, pop){
    var def = ballDef(level);
    var body = M.Bodies.circle(x, y, def.radius, {
      restitution: 0.15,    // low so it barely bounces and rolls instead
      friction: 0.05,       // low so balls slide/roll apart instead of sticking
      frictionStatic: 0.02, // low so they don't lock against each other at rest
      frictionAir: 0.012,   // damping so a roll gradually slows and coasts to a stop
      density: 0.001,
    });
    body.plugin = { level: level, landed: pop }; // merged balls (pop) skip the floor roll nudge
    M.Composite.add(world, body);
    if (pop) popScale[body.id] = 0;
    return body;
  }

  // ---- roll on landing ----
  M.Events.on(engine, 'collisionStart', function(ev){
    for (var i=0;i<ev.pairs.length;i++){
      var a = ev.pairs[i].bodyA, b = ev.pairs[i].bodyB;

      // (a) landing on the floor: start rolling immediately in a random direction.
      // v = w*r makes it a true roll (no slipping); air friction (frictionAir) then
      // bleeds the speed off so the roll gradually slows and coasts to a stop.
      var ball = null;
      if (a.label === 'floor' && b.plugin && !b.isStatic) ball = b;
      else if (b.label === 'floor' && a.plugin && !a.isStatic) ball = a;
      if (ball) {
        if (ball.plugin.landed) continue;
        ball.plugin.landed = true;
        var r = ballDef(ball.plugin.level).radius;
        var vx = (rng() < 0.5 ? -1 : 1) * (2 + rng() * 2); // random direction, magnitude 2..4
        M.Body.setVelocity(ball, { x: vx, y: ball.velocity.y });
        M.Body.setAngularVelocity(ball, vx / r); // rolling without slipping
        continue;
      }

      // (b) landing on another ball (different level; same level merges instead):
      // the upper ball gets a small roll down the slope it landed on. The roll
      // scales with how off-centre it landed — dead-centre stays balanced,
      // off the shoulder rolls off.
      if (a.plugin && b.plugin && !a.isStatic && !b.isStatic && a.plugin.level !== b.plugin.level) {
        var upper = a.position.y < b.position.y ? a : b;
        var lower = upper === a ? b : a;
        var dy = lower.position.y - upper.position.y; // >0 => upper is on top
        var dx = upper.position.x - lower.position.x; // offset = downhill direction
        if (!upper.plugin.landed && dy > Math.abs(dx)) {
          upper.plugin.landed = true;
          var ru = ballDef(upper.plugin.level).radius;
          var rollV = Math.max(-2, Math.min(2, dx * 0.1)); // small, scales with offset
          M.Body.setVelocity(upper, { x: upper.velocity.x + rollV, y: upper.velocity.y });
          M.Body.setAngularVelocity(upper, (upper.velocity.x + rollV) / ru);
        }
      }
    }
  });

  function clampX(x, level){
    var r = ballDef(level).radius;
    return Math.max(inset + r, Math.min(w - inset - r, x));
  }

  // ---- input (Pointer Events: mouse + touch, web + native) ----
  function localX(e){
    var rect = canvas.getBoundingClientRect();
    return (e.clientX - rect.left);
  }
  canvas.addEventListener('pointermove', function(e){
    previewX = clampX(localX(e), current);
  });
  canvas.addEventListener('pointerdown', function(e){
    previewX = clampX(localX(e), current);
  });
  canvas.addEventListener('pointerup', function(e){
    if (!canDrop || gameOver || !runner.enabled) return; // ignore drops while paused
    previewX = clampX(localX(e), current);
    makeBall(current, previewX, CFG.dropY, false);
    send({ type:'drop', level: current });
    canDrop = false;
    current = next;
    next = pickSpawn();
    send({ type:'next', level: next });
    setTimeout(function(){ canDrop = true; }, 380);
  });

  // ---- merging ----
  var score = 0;
  M.Events.on(engine, 'collisionStart', function(ev){
    for (var i=0;i<ev.pairs.length;i++){
      var a = ev.pairs[i].bodyA, b = ev.pairs[i].bodyB;
      if (!a.plugin || !b.plugin) continue;
      if (a.plugin.merged || b.plugin.merged) continue;
      if (a.plugin.level !== b.plugin.level) continue;
      var level = a.plugin.level;
      if (level >= CFG.maxLevel) continue;
      a.plugin.merged = true; b.plugin.merged = true;
      var mx = (a.position.x + b.position.x)/2;
      var my = (a.position.y + b.position.y)/2;
      M.Composite.remove(world, a);
      M.Composite.remove(world, b);
      delete popScale[a.id]; delete popScale[b.id];
      var nextLevel = level + 1;
      // Conserve momentum so the merge is smooth (no bounce/pop): the new ball
      // continues with the average velocity of the two equal-mass parents.
      var avgVx = (a.velocity.x + b.velocity.x) / 2;
      var avgVy = (a.velocity.y + b.velocity.y) / 2;
      var merged = makeBall(nextLevel, mx, my, true);
      M.Body.setVelocity(merged, { x: avgVx, y: avgVy });
      score += ballDef(nextLevel).score;
      send({ type:'merge', level: nextLevel, score: ballDef(nextLevel).score });
      send({ type:'score', value: score });
    }
  });

  // ---- game-over watch: a ball is 50%+ over the danger line ----
  // "50% over" = the ball's CENTER has crossed above the line (half the ball is
  // above it). A falling ball (not settled) never starts the timer, so balls
  // dropped from the top don't false-trigger while passing through the line. The
  // timer only resets when the center drops back below the line, so a momentary
  // jitter from a landing ball doesn't keep restarting the countdown.
  M.Events.on(engine, 'afterUpdate', function(){
    if (gameOver) return;
    var now = engine.timing.timestamp;
    var bodies = M.Composite.allBodies(world);
    for (var i=0;i<bodies.length;i++){
      var body = bodies[i];
      if (body.isStatic || !body.plugin) continue;
      var center = body.position.y; // 50%-over line: center above dangerY
      var settled = body.speed < 1.2;
      if (center < CFG.dangerY && settled){
        if (!overSince[body.id]) overSince[body.id] = now;
        else if (now - overSince[body.id] > 800){
          gameOver = true;
          runner.enabled = false;
          send({ type:'gameover', score: score });
          return;
        }
      } else if (center >= CFG.dangerY) {
        delete overSince[body.id]; // reset only when the center is back below the line
      }
    }
  });

  // ---- render loop ----
  function drawBall(level, x, y, angle, scale){
    var def = ballDef(level);
    var r = def.radius * (scale==null?1:scale);
    var im = imgs[String(level)];
    if (im && im.complete && im.naturalWidth > 0){
      ctx.save();
      ctx.translate(x, y); ctx.rotate(angle||0);
      ctx.drawImage(im, -r, -r, r*2, r*2);
      ctx.restore();
    } else {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI*2);
      ctx.fillStyle = def.color; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(0,0,0,0.15)'; ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.font = 'bold '+Math.max(10, r*0.7)+'px sans-serif';
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText(String(level+1), x, y);
    }
  }

  function frame(){
    ctx.clearRect(0,0,w,h);
    // danger line
    ctx.strokeStyle = 'rgba(226,59,59,0.35)';
    ctx.setLineDash([6,6]); ctx.beginPath();
    ctx.moveTo(0, CFG.dangerY); ctx.lineTo(w, CFG.dangerY); ctx.stroke();
    ctx.setLineDash([]);

    var bodies = M.Composite.allBodies(world);
    for (var i=0;i<bodies.length;i++){
      var body = bodies[i];
      if (body.isStatic || !body.plugin) continue;
      var s = popScale[body.id];
      if (s != null && s < 1){ s = Math.min(1, s + 0.1); popScale[body.id] = s; } // ~0.17s pop-in
      // ease-out so the grow decelerates into place instead of snapping
      var eased = s == null ? 1 : 1 - (1 - s) * (1 - s);
      var scale = s == null ? 1 : (0.45 + 0.55 * eased);
      drawBall(body.plugin.level, body.position.x, body.position.y, body.angle, scale);
    }
    // preview (current ball waiting to drop)
    if (canDrop && !gameOver){
      ctx.globalAlpha = 0.85;
      drawBall(current, previewX, CFG.dropY, 0, 1);
      ctx.globalAlpha = 1;
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // ---- commands from the shell ----
  window.__suika = {
    pause: function(){ runner.enabled = false; },
    resume: function(){ if(!gameOver) runner.enabled = true; },
    restart: function(){
      M.Composite.allBodies(world).forEach(function(b){
        if (!b.isStatic) M.Composite.remove(world, b);
      });
      overSince = {}; popScale = {}; score = 0; gameOver = false;
      current = pickSpawn(); next = pickSpawn(); canDrop = true;
      runner.enabled = true; // sole on/off switch; the rAF loop started once at load never stops
      send({ type:'score', value: 0 });
      send({ type:'next', level: next });
    },
    // re-broadcast initial state; the web host calls this on iframe load to
    // cover the race where the parent attaches its message listener after the
    // engine's first ready/next have already fired.
    hello: function(){
      send({ type:'ready' });
      send({ type:'score', value: score });
      send({ type:'next', level: next });
    }
  };
  // web host sends commands via postMessage({cmd:'pause'})
  window.addEventListener('message', function(e){
    var data = e.data;
    try { if (typeof data === 'string') data = JSON.parse(data); } catch(_) { return; }
    if (data && data.cmd && window.__suika[data.cmd]) window.__suika[data.cmd]();
  });

  send({ type:'ready' });
  send({ type:'next', level: next });
})();
</script>
</body>
</html>`;
}
