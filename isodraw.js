var Draw = Class.extend({
  defaultToolType: "Line",
  tools: {},
  slopes: {},
  snapDistance: 5000,

  init: function() {
    this.canvas    = document.getElementById('c');
    this.context   = this.canvas.getContext("2d");
    this.container = this.canvas.parentNode;

    this.debug_x0 = document.getElementById('debug_x0');
    this.debug_y0 = document.getElementById('debug_y0');
    this.debug_x1 = document.getElementById('debug_x1');
    this.debug_y1 = document.getElementById('debug_y1');
    this.debug_g  = document.getElementById('debug_general');

    // calculate "slope" ratios (the pixel friendly angles our lines should snap to)
    for (var x = -2; x < 3; x++) {
      for (var y = -2; y < 3; y++) {
        if (x || y) {
          var radians = Math.atan2(x, y);
          var angle   = radians * (180/Math.PI);
          var angleInt = Math.round(angle * 1000);
          this.slopes[angleInt] = {
            angle: angle,
            ratio: [x,y]
          }
        }
      }
    };

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

    var slope      = this.determineSlope(coords.x0, coords.y0, coords.x1, coords.y1);
    // var lineLength = Math.abs(coords.x1 - coords.x0);

    ctx.clearRect(0, 0, width, height);

    if (this.snapped) {
      ctx.fillStyle = "#ff0000";
    } else {
      ctx.fillStyle = "#000000";
    }
    this.controller.debug_g.innerHTML = slope.angle;

    // Translate coordinates
    var x0 = coords.x0;
    var y0 = coords.y0;
    var x1 = coords.x1;
    var y1 = coords.y1;

    // var xd = x0 - x1;
    // var yd = y0 - y1;
    // var lineLength = Math.sqrt( xd*xd + yd*yd );
    // x1 = lineLength * slope.ratio[0];
    // y1 = lineLength * slope.ratio[1];

    var deltaX = Math.abs(x1 - x0);
    var deltaY = Math.abs(y1 - y0);
    var swapX = (x0 < x1) ? 1 : -1;
    var swapY = (y0 < y1) ? 1 : -1;
    var err = deltaX - deltaY;


    ctx.fillRect(x0, y0, 1, 1);

    while(true) {
      ctx.fillRect(x0, y0, 1, 1);

      if ((x0 == x1) && (y0 == y1)) break;
      var e2 = 2 * err;
      if (e2 > -deltaY){ err -= deltaY; x0  += swapX; }
      if (e2 <  deltaX){ err += deltaX; y0  += swapY; }
    }
    ctx.closePath();
  },

  determineSlope: function(x0, y0, x1, y1) {
    var radians = Math.atan2(y0 - y1, x0 - x1);
    var angle   = radians * (180/Math.PI);
    var angleInt = Math.round(angle * 1000);

    this.controller.debug_g.innerHTML = angle;

    // snap to any predefined slopes
    for (var slope in this.controller.slopes) {
      var slopeAngle = this.controller.slopes[slope].angle;
      if (this.snap(slopeAngle, angleInt) == slopeAngle) return this.controller.slopes[slope];
    }

    // no snapping has happened, so just pass along an unsnapped angle
    return {angle: angle};
  },

  snap: function(targetAngle, currentAngle) {
    var snapDistance = this.controller.snapDistance;


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