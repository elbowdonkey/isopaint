var Tool = Class.extend({
  init: function(controller) {
    this.controller = controller; // our Draw object
    this.ctx = this.controller.tempContext;
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
    var defaultSlope  = 0;
    var selectedSlope = Math.round(this.wheelState / this.controller.scrollRes)-1;
    var deltaX        = Math.abs(coords.x1 - coords.x0);
    var deltaY        = Math.abs(coords.y1 - coords.y0);
    var len           = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    selectedSlope     = selectedSlope < 0 ? 0 : selectedSlope;

    var slope         = this.controller.slopeList[selectedSlope];

    this.ctx.clearRect(0, 0, width, height);

    var snappedX = Math.round(coords.x0 + len * Math.cos(slope));
    var snappedY = Math.round(coords.y0 + len * Math.sin(slope));

    this.ctx.fillStyle = "#000000";
    if (snappedX && snappedY) {
      this.controller.bLine(coords.x0, coords.y0, snappedX, snappedY);
    }
  },


});

var Cube = Tool.extend({
  toolType: "Cube",
  lastX: null,
  lastY: null,

  click: function(mouseEvent) {
    this.state += 1;

    if (this.state == 1) {
      // first click
      this.drawing = true;
      this.x0 = mouseEvent._x;
      this.y0 = mouseEvent._y;
      this.state += 1;
    }

    this.draw(mouseEvent);

    if (this.state == 3) {
      this.drawing = false;
      this.state = 0;

      // second click
      // this.drawing = true;
      // this.x0 = this.lastX;
      // this.y0 = this.lastY;
    }

    // if (this.state == 3) {
    //   // third click
    //   this.drawing = true;
    //   this.x0 = this.lastX;
    //   this.y0 = this.lastY;
    // }

    // if (this.state == 4) {
    //   // fourth click
    //   this.line = undefined;
    //   this.drawing = false;
    //   this.state = 0;
    // }
  },

  mousemove: function (mouseEvent) {
    if (!this.drawing) return;
    if (this.state == 2) this.draw(mouseEvent);
    // if (this.state == 2) this.drawY(mouseEvent);
    // if (this.state == 3) this.drawZ(mouseEvent);
    // if (this.state == 4) {
    //   this.lastX = null;
    //   this.lastY = null;
    // }
  },

  draw: function(mouseEvent) {
    var coords = {
      x0: this.x0,
      y0: this.y0,
      x1: mouseEvent._x,
      y1: mouseEvent._y
    };

    var l = (coords.x1 - coords.x0).abs();
    var w = (coords.y1 - coords.y0).abs();
    var ll = Math.round(l/2);
    var ww = Math.round(w/2);


    this.controller.square(coords.x0, coords.y0, l, w, "X");
    this.controller.square(coords.x0+l, coords.y0+ll, ll, w, "Y");
    this.controller.square(coords.x0, coords.y0-w, l, w, "Z");
    this.controller.updateCanvas();
  }
});

var Cylinder = Tool.extend({
  toolType: "Cylinder"
});