var Draw = Class.extend({
  defaultToolType: "Cube",
  tools: {},
  slopes: {},
  slopeList: [],
  snapDistance: 5000,
  scrollRes: 8,

  init: function() {
    this.setupCanvas();
    this.setupTempCanvas();

    this.debug = new Debug();

    this.setupSlopes();
    this.setupTools();
    this.setupHandlers();

    this.selectTool(this.defaultToolType);


  },

  setupCanvas: function() {
    this.canvas    = document.getElementById('c');
    this.context   = this.canvas.getContext("2d");
    this.image     = this.context.getImageData(0, 0, this.canvas.width, this.canvas.height);
    this.container = this.canvas.parentNode;
  },

  setupTempCanvas: function() {
    this.tempCanvas     = document.getElementById('tmp');
    this.tempContext   = this.tempCanvas.getContext("2d");
    this.tempImage     = this.tempContext.getImageData(0, 0, this.canvas.width, this.canvas.height);
    this.tempContainer = this.tempCanvas.parentNode;
  },

  setupSlopes: function() {
    // calculate "slope" ratios (the pixel friendly angles our lines should snap to)
    // TODO: not sure about memoization using angle values
    this.slopes = {
        n: { ratio: [  0, -1], degrees: -180.000,  radians: 0.0000 },
      nne: { ratio: [  1, -2], degrees: -153.435,  radians: 0.4636 },
       ne: { ratio: [  1, -1], degrees: -135.000,  radians: 0.7853 },
      ene: { ratio: [  2, -1], degrees: -116.565,  radians: 1.1071 },
        e: { ratio: [  1,  0], degrees:  -90.000,  radians: 1.5707 },
      ese: { ratio: [  2,  1], degrees:  -63.435,  radians: 2.0344 },
       se: { ratio: [  1,  1], degrees:  -45.000,  radians: 2.3561 },
      sse: { ratio: [  1,  2], degrees:  -26.565,  radians: 2.6779 },
        s: { ratio: [  0,  1], degrees:    0.000,  radians: 3.1415 },
      ssw: { ratio: [ -1,  2], degrees: -206.565,  radians: 0.4636 },
       sw: { ratio: [ -1,  1], degrees: -225.000,  radians: 0.7853 },
      wsw: { ratio: [ -2,  1], degrees: -243.435,  radians: 1.1071 },
        w: { ratio: [ -1,  0], degrees: -270.000,  radians: 1.5707 },
      wnw: { ratio: [ -2, -1], degrees: -296.565,  radians: 2.0344 },
       nw: { ratio: [ -1, -1], degrees: -315.000,  radians: 2.3561 },
      nwn: { ratio: [ -1, -2], degrees: -333.435,  radians: 2.6779 },
    }
  },

  setupHandlers: function() {
    this.tempCanvas.addEventListener('mousedown',  this.handleMouse.bind(this), false);
    this.tempCanvas.addEventListener('mousemove',  this.handleMouse.bind(this), false);
    this.tempCanvas.addEventListener('mouseup',    this.handleMouse.bind(this), false);
    this.tempCanvas.addEventListener('click',      this.handleMouse.bind(this), false);
    this.tempCanvas.addEventListener('mousewheel', this.handleMouse.bind(this), false);
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
    var buffer = new ArrayBuffer(this.image.data.length);
    var buf8 = new Uint8ClampedArray(buffer);

    this.tempContext.putImageData(this.tempImage, 0, 0);
    this.tempImage.data.set(buf8);
    this.context.putImageData(this.tempImage, 0, 0);
    // this.context.drawImage(this.tempCanvas, 0, 0);
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

  directLine: function(origin, dir, width) {
    var slope = this.slopes[dir];
    var dirX  = slope.ratio[0];
    var dirY  = slope.ratio[1];
    var height = width * Math.abs(dirY);
    var y = 0;
    var cX = 0;
    var cY = 0;
    var oX = origin[0];
    var oY = origin[1];
    var ix, iy;

    var count = 0;
    var x = 0;
    var y = 0;
    var xc = 0;
    var yc = 0;

    while(count < width) {
      count += 1;

      if (dirX.abs() == 2) {
        if (count % dirX) y += dirY.sign();
        x += dirX.sign();
      }

      if (dirY.abs() == 2) {
        if (count % dirY) x += dirX.sign();
        y += dirY.sign();
      }

      if (dirX.abs() == 1 && dirY.abs() == 1) {
        y += dirY.sign();
        x += dirX.sign();
      }

      if (dirX.abs() == 0 && dirY.abs() == 1) {
        y += dirY.sign();
      }

      if (dirX.abs() == 1 && dirY.abs() == 0) {
        x += dirX.sign();
      }


      var index = (((oY + y) * this.canvas.width + (oX + x)) * 4);
      var color = [0,0,0];

      this.tempImage.data[  index] = color[0];
      this.tempImage.data[++index] = color[1];
      this.tempImage.data[++index] = color[2];
      this.tempImage.data[++index] = 255;

    };
    // this.tempContext.putImageData(this.tempImage, 0, 0);
  },

  square: function(x1, y1, l, w, axis) {
    var a,b,c,d;
    var ll = Math.round(l/2);
    var ww = Math.round(w/2);

    if (axis == "X") {
      a = [x1, y1];
      b = [x1, y1];
      c = [x1+l, y1+ll];
      d = [x1, y1-w];
      this.directLine(a, "n", w);
      this.directLine(b, "ese", l);
      this.directLine(c, "n", w);
      this.directLine(d, "ese", l);
    }

    if (axis == "Y") {
      a = [x1, y1];
      b = [x1, y1];
      c = [x1+l, y1-ll];
      d = [x1, y1-w];
      this.directLine(a, "n", w);
      this.directLine(b, "ene", l);
      this.directLine(c, "n", w);
      this.directLine(d, "ene", l);
    }

    if (axis == "Z") {
      c = [x1+l+ll, y1 + parseInt(l * 0.25)];
      d = [x1, y1];

      this.directLine(c, "wnw", l);
      this.directLine(d, "ene", ll);
    }


  },

  clear: function() {
    var width         = this.controller.canvas.width;
    var height        = this.controller.canvas.height;
    this.ctx.clearRect(0, 0, width, height);
  },
});

