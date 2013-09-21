var Draw = Class.extend({
  defaultToolType: "Cube",
  tools: {},
  slopes: {},
  slopeList: [],
  snapDistance: 5000,
  scrollRes: 8,

  init: function() {
    this.canvas    = document.getElementById('c');
    this.context   = this.canvas.getContext("2d");
    this.container = this.canvas.parentNode;

    this.debug = new Debug();

    // calculate "slope" ratios (the pixel friendly angles our lines should snap to)
    // TODO: not sure about memoization using angle values
    for (var x = -2; x < 3; x++) {
      for (var y = -2; y < 3; y++) {
        if (x || y) {
          var radians = Math.atan2(x, y);
          var angle   = (radians * (180/Math.PI))-180;
          var angleInt = Math.round(angle * 1000);
          this.slopes[angleInt] = {
            angle: angle,
            ratio: [x,y],
            radians: radians
          }
          this.slopeList.push(radians);
        }
      }
    };

    // sort a list of sanctioned slopes by degrees
    this.slopeList.sort(function(a,b) {
      return b.toDeg() - a.toDeg();
    });

    this.setupTempCanvas();

    this.setupTools();
    this.selectTool(this.defaultToolType);

    this.tempCanvas.addEventListener('mousedown',  this.handleMouse.bind(this), false);
    this.tempCanvas.addEventListener('mousemove',  this.handleMouse.bind(this), false);
    this.tempCanvas.addEventListener('mouseup',    this.handleMouse.bind(this), false);
    this.tempCanvas.addEventListener('click',      this.handleMouse.bind(this), false);
    this.tempCanvas.addEventListener('mousewheel', this.handleMouse.bind(this), false);
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
    this.state = 0;
    this.wheelState = 0;
  },

  handleMouse: function(mouseEvent) {
    this[mouseEvent.type](mouseEvent);
  },

  click: function(mouseEvent) {
    this.state += 1;

    if (this.state == 1) {
      // first click
      this.drawing = true;
      this.x0 = mouseEvent._x;
      this.y0 = mouseEvent._y;
    }

    if (this.state == 2) {
      // second click
      this.drawing = false;
      this.controller.updateCanvas();
      this.state = 0;
    }
  },

  mousewheel: function(mouseEvent) {
    if (this.wheelState >= this.controller.scrollRes * 24) this.wheelState = 0;
    if (this.wheelState <= 0) this.wheelState = 24;

    if (mouseEvent.wheelDelta > 0) this.wheelState += 1;
    if (mouseEvent.wheelDelta < 0) this.wheelState -= 1;
  },

  mousedown: function(mouseEvent) {},
  mousemove: function(mouseEvent) {},
  mouseup: function(mouseEvent) {},
});

var Line = Tool.extend({
  toolType: "Line",

  mousemove: function (mouseEvent) {
    if (!this.drawing) return;

    var coords = {
      x0: this.x0,
      y0: this.y0,
      x1: mouseEvent._x,
      y1: mouseEvent._y
    };

    var width         = this.controller.canvas.width;
    var height        = this.controller.canvas.height;
    var ctx           = this.controller.tempContext;
    var defaultSlope  = 0;
    var selectedSlope = Math.round(this.wheelState / this.controller.scrollRes)-1;
    var deltaX        = Math.abs(coords.x1 - coords.x0);
    var deltaY        = Math.abs(coords.y1 - coords.y0);
    var len           = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    selectedSlope     = selectedSlope < 0 ? 0 : selectedSlope;

    var slope         = this.controller.slopeList[selectedSlope];

    ctx.clearRect(0, 0, width, height);

    var snappedX = Math.round(coords.x0 + len * Math.cos(slope));
    var snappedY = Math.round(coords.y0 + len * Math.sin(slope));

    ctx.fillStyle = "#000000";
    if (snappedX && snappedY) {
      this.bresenhamLine(coords.x0, coords.y0, snappedX, snappedY);
    }
  },

  bresenhamLine: function(x0, y0, x1, y1) {
    // Bresenham Line Algorithm
    var ctx = this.controller.tempContext;
    var dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1;
    var dy = Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
    var err = (dx>dy ? dx : -dy)/2;
    var safety = 100;

    while (true) {
      safety -= 1;
      if (safety <= 0) break;
      ctx.fillRect(x0, y0, 1, 1);
      if (x0 === x1 && y0 === y1) break;
      var e2 = err;
      if (e2 > -dx) { err -= dy; x0 += sx; }
      if (e2 < dy) { err += dx; y0 += sy; }
    }
  },

  ddaLine: function(x1, y1, x2, y2) {
    // DDA Line Algorithm
    var ctx    = this.controller.tempContext;
    var length = Math.abs(x2 - x1);

    if (Math.abs(y2 - y1) > length) {
      length = Math.abs(y2 - y1);
    }

    var xincrement = (x2 - x1) / length;
    var yincrement = (y2 - y1) / length;

    var x = x1 + 0.5;
    var y = y1 + 0.5;

    for (var i = 0; i < length; i++) {
      ctx.fillRect(x, y, 1, 1);
       x = x + xincrement;
       y = y + yincrement;
    }
  },

  eflaLineD: function(x, y, x2, y2) {
    // Extremely Fast Line Algorithm Var D (Addition Fixed Point)
    var ctx = this.controller.tempContext;
    var incrementVal, endVal;
    var yLonger  = false;
    var shortLen = y2 - y;
    var longLen  = x2 - x;
    var swap;

    if (Math.abs(shortLen) > Math.abs(longLen)) {
      swap     = shortLen;
      shortLen = longLen;
      longLen  = swap;
      yLonger  = true;
    }

    endVal = longLen;

    if (longLen < 0) {
      incrementVal =- 1;
      longLen =- longLen;
    } else {
      incrementVal = 1;
    }

    var decInc;
    if (longLen == 0) {
      decInc = 0;
    } else {
      decInc = (shortLen << 16) / longLen;
    }

    var j = 0;
    if (yLonger) {
      for (var i=0; i != endVal; i += incrementVal) {
        ctx.fillRect(x+(j >> 16),y+i, 1, 1);
        j += decInc;
      }
    } else {
      for (var i=0; i != endVal; i += incrementVal) {
        ctx.fillRect(x+i,y+(j >> 16), 1, 1);
        j += decInc;
      }
    }
  }
});

var Cube = Tool.extend({
  toolType: "Cube",
  lastX: null,
  lastY: null,

  click: function(mouseEvent) {
    this.state += 1;

    if (this.state == 1) {
      // first click
      this.line = new Line(this.controller);
      this.drawing = true;
      this.x0 = mouseEvent._x;
      this.y0 = mouseEvent._y;
      this.originalX = this.x0;
      this.originalY = this.y0;
      this.controller.updateCanvas();
    }

    if (this.state == 2) {
      // second click
      this.drawing = true;
      this.x0 = this.lastX;
      this.y0 = this.lastY;
      this.controller.updateCanvas();
    }

    if (this.state == 3) {
      // third click
      this.drawing = true;
      this.x0 = this.lastX;
      this.y0 = this.lastY;
      this.controller.updateCanvas();
    }

    if (this.state == 4) {
      // fourth click
      this.line = undefined;
      this.drawing = false;
      this.controller.updateCanvas();
      this.state = 0;
    }
  },

  mousemove: function (mouseEvent) {
    if (!this.drawing) return;
    if (this.state == 1) this.drawX(mouseEvent);
    if (this.state == 2) this.drawY(mouseEvent);
    if (this.state == 3) this.drawZ(mouseEvent);
    if (this.state == 4) {
      this.lastX = null;
      this.lastY = null;
    }
  },

  clearCtx: function() {
    var width         = this.controller.canvas.width;
    var height        = this.controller.canvas.height;
    var ctx           = this.controller.tempContext;
    ctx.clearRect(0, 0, width, height);
  },

  drawX: function (mouseEvent) {
    this.draw("X", mouseEvent);
  },

  drawY: function (mouseEvent) {
    this.draw("Y", mouseEvent);
  },

  drawZ: function (mouseEvent) {
    this.draw("Z", mouseEvent);
    /*
      if we know original click pos, the length of Y, and Z length, we can draw
      three vertical lines of identical length here, outside of the generica draw("z")
    */
  },

  draw: function(axis, mouseEvent) {
    var ctx = this.controller.tempContext;
    var coords = {
      x0: this.x0,
      y0: this.y0,
      x1: mouseEvent._x,
      y1: mouseEvent._y
    };
    var deltaX        = Math.abs(coords.x1 - coords.x0);
    var deltaY        = Math.abs(coords.y1 - coords.y0);
    var len           = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    var slopeIndex;

    if (axis == "X") slopeIndex = 11;
    if (axis == "Y") slopeIndex = 14;
    if (axis == "Z") slopeIndex = 18;

    var slope = this.controller.slopeList[slopeIndex];

    this.clearCtx();

    var snappedX = Math.round(coords.x0 + len * Math.cos(slope));
    var snappedY = Math.round(coords.y0 + len * Math.sin(slope));

    this.lastX = snappedX;
    this.lastY = snappedY;

    ctx.fillStyle = "#000000";
    if (snappedX && snappedY) {
      this.line.bresenhamLine(coords.x0, coords.y0, snappedX, snappedY);
    }
  }
});

var Cylinder = Tool.extend({
  toolType: "Cylinder"
});