var Draw = Class.extend({
  defaultToolType: "Line",
  tools: {},
  slopes: {
    a: 26.565,
    b: 333.435,
    c: 206.565,
    d: 153.435
  },

  init: function() {
    this.canvas    = document.getElementById('c');
    this.context   = this.canvas.getContext("2d");
    this.container = this.canvas.parentNode;

    this.debug_x0 = document.getElementById('debug_x0');
    this.debug_y0 = document.getElementById('debug_y0');
    this.debug_x1 = document.getElementById('debug_x1');
    this.debug_y1 = document.getElementById('debug_y1');
    this.debug_g  = document.getElementById('debug_general');


    this.setupTempCanvas();

    this.setupTools();
    this.selectTool(this.defaultToolType);

    this.tempCanvas.addEventListener('mousedown', this.handleMouse.bind(this), false);
    this.tempCanvas.addEventListener('mousemove', this.handleMouse.bind(this), false);
    this.tempCanvas.addEventListener('mouseup',   this.handleMouse.bind(this), false);
  },

  setupTempCanvas: function () {
    this.tempCanvas        = document.createElement('canvas');
    this.tempCanvas.id     = 'tmp';
    this.tempCanvas.width  = this.canvas.width;
    this.tempCanvas.height = this.canvas.height;
    this.tempContext       = this.tempCanvas.getContext('2d');

    this.container.appendChild(this.tempCanvas);
  },

  setupTools: function() {
    this.tools["Line"]     = new Line(this);
    this.tools["Cube"]     = new Cube(this);
    this.tools["Cylinder"] = new Cylinder(this);
  },

  selectTool: function(toolType) {
    this.currentTool = this.tools[toolType];
  },

  updateCanvas: function() {
    this.context.drawImage(this.tempCanvas, 0, 0);
    this.tempContext.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // this.tempContext.scale(2,2);
    // this.context.scale(2,2);
  },

  undo: function() {},

  redo: function() {},

  handleMouse: function(mouseEvent) {
    this.getCoordinates(mouseEvent);
    this.currentTool.handleMouse(mouseEvent);
  },

  getCoordinates: function(mouseEvent) {
    /*
      since firefox uses layerX, and webkit uses offsetX, we can standardize
      how we refer to where the event happened by tacking on our own attributes
    */

    if (mouseEvent.layerX || mouseEvent.layerX == 0) {
      mouseEvent._x = mouseEvent.layerX;
      mouseEvent._y = mouseEvent.layerY;
    } else {
      mouseEvent._x = mouseEvent.offsetX;
      mouseEvent._y = mouseEvent.offsetY;
    }

    return [mouseEvent._x, mouseEvent._y];
  },
});

var Tool = Class.extend({
  init: function(controller) {
    this.controller = controller; // our Draw object
    this.drawing = false;
    this.snapped = false;
  },

  handleMouse: function(mouseEvent) {
    this[mouseEvent.type](mouseEvent);
  },

  mousedown: function(mouseEvent) {
    this.drawing = true;
    this.x0      = mouseEvent._x;
    this.y0      = mouseEvent._y;

    this.controller.debug_x0.innerHTML = this.x0;
    this.controller.debug_y0.innerHTML = this.y0;
  },

  mousemove: function(mouseEvent) {

  },

  mouseup: function(mouseEvent) {
    if (this.drawing) {
      this.mousemove(mouseEvent);
      this.drawing = false;
      this.controller.updateCanvas();
    }
  },
});

var Line = Tool.extend({
  toolType: "Line",
  lineRatios: {
    xx: [2,1],
    yy: [1,2]
  },

  mousemove: function (mouseEvent) {
    // this.controller.debug_x1.innerHTML = mouseEvent._x;
    // this.controller.debug_y1.innerHTML = mouseEvent._y;
    if (!this.drawing) return;

    var width  = this.controller.canvas.width;
    var height = this.controller.canvas.height;
    var ctx    = this.controller.tempContext;

    var coords = {
      x0: this.x0,
      y0: this.y0,
      x1: mouseEvent._x,
      y1: mouseEvent._y
    };

    var slope = this.determineSlope(coords.x0, coords.y0, coords.x1, coords.y1);

     // TODO: fix for lines that don't go from upper left to lower right
    var lineLength = Math.abs(coords.x1 - coords.x0);

    ctx.clearRect(0, 0, width, height);

    if (this.snapped) {
      ctx.fillStyle = "#ff0000";
      for (var i = 0; i < lineLength; i += 2) {
        var point;
        var y_a = coords.y0 + (i/2);
        var y_b = coords.y0 - (i/2);
        var x_a = coords.x0 + i;
        var x_b = coords.x0 - i;

        if (slope == this.controller.slopes.a) point = [x_a, y_a];
        if (slope == this.controller.slopes.b) point = [x_a, y_b];
        if (slope == this.controller.slopes.c) point = [x_b, y_b];
        if (slope == this.controller.slopes.d) point = [x_b, y_a];

        ctx.fillRect(point[0], point[1], 2, 1);
      }
    } else {
      ctx.fillStyle = "#000000";
      ctx.beginPath();
      ctx.moveTo(coords.x0, coords.y0);
      ctx.lineTo(coords.x1, coords.y1);
      ctx.stroke();
      ctx.closePath();
    }

    // switch(slope) {
    //   case this.controller.slopes.a:
    //     for (var i = 0; i < lineLength; i += 2) {
    //       ctx.fillRect(coords.x0 + i, coords.y0 + (i/2), 2, 1);
    //     }
    //   break;

    //   case this.controller.slopes.b:
    //     for (var i = 0; i < lineLength; i += 2) {
    //       ctx.fillRect(coords.x0 + i, coords.y0 - (i/2), 2, 1);
    //     }
    //   break;

    //   case this.controller.slopes.c:
    //     for (var i = 0; i < lineLength; i += 2) {
    //       ctx.fillRect(coords.x0 - i, coords.y0 - (i/2), 2, 1);
    //     }
    //   break;

    //   case this.controller.slopes.d:
    //     for (var i = 0; i < lineLength; i += 2) {
    //       ctx.fillRect(coords.x0 - i, coords.y0 + (i/2), 2, 1);
    //     }
    //   break;

    //   // case this.controller.slopes.c:
    //   //   ctx.fillStyle = "#ff0000";
    //   //   for (var i = lineLength; i <= 0; i-=2) ctx.fillRect(coords.x0 + i, coords.y0 - (i/2), 2, 1);
    //   //   ctx.strokeStyle = "#000";
    //   // break;

    //   // case this.controller.slopes.d:
    //   //   ctx.fillStyle = "#ff0000";
    //   //   for (var i = lineLength; i <= 0; i-=2) ctx.fillRect(coords.x0 + i, coords.y0 + (i/2), 2, 1);
    //   //   ctx.strokeStyle = "#000";
    //   // break;

    //   default:
    //     ctx.beginPath();
    //     ctx.moveTo(coords.x0, coords.y0);
    //     ctx.lineTo(coords.x1, coords.y1);
    //     ctx.stroke();
    //     ctx.closePath();
    // }
  },

  determineSlope: function(x0, y0, x1, y1) {
    var radians = Math.atan2(y0 - y1, x0 - x1);
    var angle   = (radians * (180/Math.PI)) + 180;
    var angleInt = Math.round(angle * 1000);


    var snapDistance = 10000;
    var a = this.controller.slopes.a;
    var b = 360 - this.controller.slopes.a;
    var c = 180 + this.controller.slopes.a;
    var d = 180 - this.controller.slopes.a;

    this.controller.debug_g.innerHTML = angle;


    if (this.snap(a, angleInt) == a) return a;
    if (this.snap(b, angleInt) == b) return b;
    if (this.snap(c, angleInt) == c) return c;
    if (this.snap(d, angleInt) == d) return d;

    return angle;
  },

  snap: function(targetAngle, currentAngle) {
    var snapDistance = 10000;

    if (currentAngle >= ((targetAngle * 1000) - snapDistance) && currentAngle < ((targetAngle * 1000) + snapDistance)) {
      this.snapped = true;
      return targetAngle;
    }
    this.snapped = false;
    return currentAngle;
  }
});

var Cube = Tool.extend({
  toolType: "Cube"
});

var Cylinder = Tool.extend({
  toolType: "Cylinder"
});