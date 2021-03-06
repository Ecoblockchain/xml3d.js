var Vec3 = require("./vec3.js");
var vec3 = require("gl-matrix").vec3;

var Ray = function(ray) {
    if (this instanceof Ray) {
        this.data = new Float32Array(6);
        this.data[5] = -1;
        if (ray) {
            this.data.set( ray.data ? ray.data : ray );
        }
    } else {
        return new Ray(ray);
    }
};

Object.defineProperty(Ray.prototype, "origin", {
    set: function(v){
        var val = v.data ? v.data : v;
        this.data[0] = val[0];
        this.data[1] = val[1];
        this.data[2] = val[2];
    },
    get: function(){
        return Vec3.wrap(this.data.subarray(0,3));
    }
});

Object.defineProperty(Ray.prototype, "direction", {
    set: function(v){
        var val = v.data ? v.data : v;
        vec3.normalize(val, val);
        this.data[3] = val[0];
        this.data[4] = val[1];
        this.data[5] = val[2];
    },
    get: function(){
        return Vec3.wrap(this.data.subarray(3,6));
    }
});

Ray.prototype.setFromOriginDirection = function(origin, direction) {
    this.origin = origin;
    this.direction = direction;
    return this;
};

Ray.prototype.clone = function() {
    return new Ray().copy(this);
};

Ray.prototype.copy = function(other) {
    this.copyOrigin(other);
    this.copyDirection(other);
    return this;
};

Ray.prototype.copyOrigin = function(other) {
    vec3.copy(this.data, other.data ? other.data : other);
    return this;
};

Ray.prototype.copyDirection = function(other) {
    vec3.copy(this.data.subarray(3,6), other.data ? other.data.subarray(3,6) : other.subarray(3,6));
    return this;
};

Ray.prototype.intersects = function(box, opt) {
    return box.intersects(this, opt);
};

Ray.prototype.toString = function() {
    return 'XML3D.Ray(origin: ' + this.data[0] + ', ' + this.data[1] + ', ' + this.data[2] + ', direction: ' + this.data[3] + ', ' +
        this.data[4] + ', ' + this.data[5] + ')';
};

module.exports = Ray;
