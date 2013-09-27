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

  plotter: function(count, x, y, dir, width, axis) {
    var slopeX   = this.slopes[dir].ratio[0];
    var slopeY   = this.slopes[dir].ratio[1];
    var slopeXa  = Math.abs(slopeX);
    var slopeYa  = Math.abs(slopeY);
    var slopeXs  = slopeX.sign();
    var slopeYs  = slopeY.sign();

    if (slopeXa + slopeYa == 2) {
      y += slopeYs;
      x += slopeXs;
    }

    if (!slopeXa && slopeYa) y += slopeYs;
    if (slopeXa && !slopeYa) x += slopeXs;

    if (slopeXa == 2) {
      x += slopeXs;
      y += count % slopeX ? slopeYs : 0;
    }

    if (slopeYa == 2) {
      x += count % slopeY ? slopeXs : 0;
      y += slopeYs;
    }

    return [x,y];
  },

  directLine: function(origin, dir, width, axis) {
    var count    = 0;
    var x        = 0;
    var y        = 0;
    var coords;

    while(count < width) {
      count += 1;
      coords = this.plotter(count, x, y, dir, width, axis);
      x = coords[0];
      y = coords[1];

      var index = ((origin[1] + y) * this.canvas.width + (origin[0] + x)) * 4;
      var color = [0,0,0];

      this.tempImage.data[  index] = color[0];
      this.tempImage.data[++index] = color[1];
      this.tempImage.data[++index] = color[2];
      this.tempImage.data[++index] = 255;

      // if (axis == "X") {
      //   for (var i = 0; i < height; i++) {
      //     var filldex = ((origin[1] + y-i) * this.canvas.width + (origin[0] + x)) * 4;
      //     var fill = [255,0,0];
      //     this.tempImage.data[  filldex] = fill[0];
      //     this.tempImage.data[++filldex] = fill[1];
      //     this.tempImage.data[++filldex] = fill[2];
      //     this.tempImage.data[++filldex] = 255;
      //   };
      // }
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
      this.directLine(a, "n", w, axis);
      this.directLine(b, "ese", l, axis);
      this.directLine(c, "n", w, axis);
      this.directLine(d, "ese", l, axis);
      this.fillSquare(b, "ese", w, l, axis);
    }

    if (axis == "Y") {
      a = [x1, y1];
      b = [x1, y1];
      c = [x1+l, y1-ll];
      d = [x1, y1-w];
      this.directLine(a, "n", w, axis);
      this.directLine(b, "ene", l, axis);
      this.directLine(c, "n", w, axis);
      this.directLine(d, "ene", l, axis);
      this.fillSquare(b, "ene", w, l, axis);
    }

    if (axis == "Z") {
      c = [x1+l+ll, y1 + parseInt(l * 0.25)];
      d = [x1, y1];

      this.directLine(c, "wnw", l, axis);
      this.directLine(d, "ene", ll, axis);
      // this.fillSquare(d, "ene", ll, l, axis);
    }
  },

  fillSquare: function(origin, dir, width, length, axis) {
    var count    = 0;
    var x        = 0;
    var y        = 0;
    var coords;
    var fill;

    if (axis == "X") fill = [200,200,200];
    if (axis == "Y") fill = [230,230,230];
    if (axis == "Z") fill = [0,0,255];


    while(count < length-1) {
      count += 1;
      coords = this.plotter(count, x, y, dir, length, axis);
      x = coords[0];
      y = coords[1];

      // if (axis == "X") {
        for (var i = 1; i < width; i++) {
          var filldex = ((origin[1] + y-i) * this.canvas.width + (origin[0] + x)) * 4;
          this.tempImage.data[  filldex] = fill[0];
          this.tempImage.data[++filldex] = fill[1];
          this.tempImage.data[++filldex] = fill[2];
          this.tempImage.data[++filldex] = 255;
        };
      // }
    }
  },

  clear: function() {
    var width  = this.controller.canvas.width;
    var height = this.controller.canvas.height;
    this.ctx.clearRect(0, 0, width, height);
  },
});

