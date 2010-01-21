var org;
if (!org)
	org = {};
else if (typeof org != "object")
	throw new Error("org already exists and is not an object");

if (!org.xml3d)
	org.xml3d = {};
else if (typeof org.xml3d != "object")
	throw new Error("org.xml3d already exists and is not an object");

org.xml3d.Xml3dSceneController = function(canvas, xml3d) {
	var self = this;
	this.buildIn = xml3d.style !== undefined;

	this.xml3d = this.buildIn ? canvas : xml3d;
	this.canvas = canvas;
	this.camera = document.getElementById("controller_view");
	var InputPanelId = null;

	this.old_x = -1;
	this.old_y = -1;
	this.yaw = 0;
	this.pitch = 0;
	
	this.createVec3 = function(x, y, z){
		var res = this.xml3d.createXML3DVec3();
		res.x = x; res.y = y; res.z = z;
		return res;
	};

	if(this.buildIn)
	{
		this.UPVECTOR = this.createVec3(0, 1, 0);
		this.ZVECTOR = this.createVec3(0, 0, -1);	}
	else
	{
		this.UPVECTOR = new org.xml3d.dataTypes.Vec3f(0.0, 1.0, 0.0);
		this.ZVECTOR = new org.xml3d.dataTypes.Vec3f(0.0, 0.0, -1.0);	
	}

	this.moveSpeedElement = document.getElementById("moveSpeed");

	if (!this.xml3d || !this.camera)
	{
		return;
	}
		

	
	this.rotateSpeed = 0.005;

	this.canvas.addEventListener("mousedown", function(event) {
		self.startDrag(event);
	}, false);
	document.addEventListener("mouseup", function(event) {
		self.stopDrag(event);
	}, false);
	document.addEventListener("mousemove", function(event) {
		self.manageDrag(event);
	}, false);
	document.addEventListener("contextmenu", function(event) {
		self.stopEvent(event);
	}, false);
	document.addEventListener("keydown", function(event) {
		self.keyHandling(event);
	}, false);
	
	if(this.buildIn)
	{
		this.setUpdateFrequence(30);
	}

	// Create Input Panel
	if (InputPanelId) {
		this.inputPanel = document.getElementById(InputPanelId);
		this.inputForm = document.createElement("form");
		this.inputPanel.appendChild(this.inputForm);
		this.inputPosX = this.createInput("PositionX", this.inputForm);
		this.inputPosY = this.createInput("PositionY", this.inputForm);
		this.inputPosZ = this.createInput("PositionZ", this.inputForm);
		this.inputDirX = this.createInput("DirectionX", this.inputForm);
		this.inputDirY = this.createInput("DirectionY", this.inputForm);
		this.inputDirZ = this.createInput("DirectionZ", this.inputForm);
		this.submit = document.createElement("input");
		this.submit.type = "submit";
		this.submit.name = "update";
		this.submit.value = "Update";
		this.inputForm.appendChild(this.submit);
		this.inputForm.addEventListener("submit", function(event) {
			self.takeInput(event);
		}, false);
		this.updateInput();
	}

};

org.xml3d.Xml3dSceneController.prototype.getMoveScale = function() {
	if (this.moveSpeedElement)
		return this.moveSpeedElement.value;
	return 1.0;
};

org.xml3d.Xml3dSceneController.prototype.stopEvent = function(ev) {
	this.stopPropagation(ev);
	this.preventDefault(ev);
};

org.xml3d.Xml3dSceneController.prototype.stopPropagation = function(ev) {
	if (ev.stopPropagation) {
		ev.stopPropagation();
	} else {
		ev.cancelBubble = true;
	}
};

org.xml3d.Xml3dSceneController.prototype.preventDefault = function(ev) {
	if (ev.preventDefault) {
		ev.preventDefault();
	} else {
		ev.returnValue = false;
	}
};

org.xml3d.Xml3dSceneController.prototype.update = function() {
	if (this.animation || this.needUpdate) {
		this.needUpdate = false;
		if (this.xml3d.update)
			this.xml3d.update();
		this.updateInput();
	}
};

org.xml3d.Xml3dSceneController.prototype.setUpdateFrequence = function(
		frequence) {
	var self = this;
	if (this.intervalHandle)
		clearTimeout(this.intervalHandle);
	this.intervalHandle = setInterval(function() {
		self.update();
	}, frequence);
};

org.xml3d.Xml3dSceneController.prototype.startDrag = function(event) {
	// if (event.preventDefault) {
	// event.preventDefault();
	// }

	this.stopEvent(event);

	ev = event || window.event;

	this.dragButton = (ev.which || ev.button);
	this.dragActive = true;
	this.old_x = ev.pageX;
	this.old_y = ev.pageY;

	return false;
};

org.xml3d.Xml3dSceneController.prototype.stopDrag = function(event) {
	this.stopEvent(event);
	this.dragActive = false;
	return false;
};

org.xml3d.Xml3dSceneController.prototype.manageDrag = function(event) {
	this.stopEvent(event);

	ev = event || window.event;

	/*
	 * var direction = this.camera.direction; var up = this.camera.up; up.x =
	 * up.z = 0; up.y = 1;
	 */

	if (this.dragActive) {
		if (this.dragButton == 1) {
			this.rotate(ev);
		}
		if (this.dragButton == 3) {
			this.dolly(ev);
		}
		this.needUpdate = true;
	}
	return false;
};

org.xml3d.Xml3dSceneController.prototype.dolly = function(ev) {

	var dy = (ev.pageY - this.old_y);
	if(this.camera.getDirection !== undefined){
		var dir = this.camera.getDirection();
		this.camera.position = this.camera.position.add(dir.scale(-dy * 0.5));
	} else {
		var direction = this.camera.orientation.rotateVec(this.ZVECTOR)
				.normalised();
		this.camera.position = this.camera.position.add(direction
				.scale(-dy * 0.5));
	}

	this.old_x = ev.pageX;
	this.old_y = ev.pageY;

};

org.xml3d.Xml3dSceneController.prototype.rotate = function(ev) {

	var dx = (ev.pageX - this.old_x) * this.rotateSpeed;
	var dy = (ev.pageY - this.old_y) * this.rotateSpeed;

	if (this.camera.getDirection !== undefined) {

		var dir = this.camera.getDirection();
		
		if (dx) {
			this.yaw -= dx;
			/*
			if(this.yaw < 0)
				this.yaw += 360;
			if(this.yaw > 360)
				this.yaw -= 360;
			*/
		}
		if (dy) {
			this.pitch -= dy;
			
			if(this.pitch < -1.5)
				this.pitch = -1.5;
			if(this.pitch > 1.5)
				this.pitch = 1.5;
		}
		var newdir = this.ZVECTOR;
		var rot1 = this.ZVECTOR.cross(this.UPVECTOR);
		var m = org.xml3d.dataTypes.SFMatrix4.parseRotation(rot1.x + " "
				+ rot1.y + " " + rot1.z + " " + this.pitch);
		var newdir = m.multMatrixVec(newdir);
		
		var rot2 = this.UPVECTOR;
		var m = org.xml3d.dataTypes.SFMatrix4.parseRotation(rot2.x + " "
				+ rot2.y + " " + rot2.z + " " + this.yaw);
		var newdir = m.multMatrixVec(newdir);
		dir.x = newdir.x;
		dir.y = newdir.y;
		dir.z = newdir.z;
		this.camera.setUpVector(this.UPVECTOR);
		this.camera.setDirection(dir);
	} else {
		var direction = this.camera.orientation.rotateVec(this.ZVECTOR)
				.normalised();
		var up = this.camera.orientation.rotateVec(this.UPVECTOR).normalised();

		if (dx) {
			var s = Math.sin(dx);
			var c = Math.cos(dx);
			var length1 = Math.sqrt(direction.x * direction.x + direction.z
					* direction.z);
			direction.x = c * direction.x - s * direction.z;
			direction.z = s * direction.x + c * direction.z;
			length1 /= Math.sqrt(direction.x * direction.x + direction.z
					* direction.z);
			direction.x = direction.x * length1;
			direction.z = direction.z * length1;
		}
		if (dy) {
			var rotVec = direction.cross(up);
			var rot = org.xml3d.dataTypes.Quaternion.axisAngle(rotVec, -dy);
			direction = rot.rotateVec(direction).normalised();
		}
		var xAxis = direction.cross(up);
		this.camera.orientation = org.xml3d.dataTypes.Quaternion.fromBasis(
				xAxis, xAxis.cross(direction), direction.negate());
	}

	this.old_x = ev.pageX;
	this.old_y = ev.pageY;

};

// -----------------------------------------------------
// key movement
// -----------------------------------------------------

org.xml3d.Xml3dSceneController.prototype.keyHandling = function(e) {
	var KeyID = e.keyCode;
	if (KeyID == 0) {
		switch (e.which) {
		case 119:
			KeyID = 87;
			break; // w
		case 100:
			KeyID = 68;
			break; // d
		case 97:
			KeyID = 65;
			break; // a
		case 115:
			KeyID = 83;
			break; // s
		}
	}

	var xml3d = this.xml3d;
	// alert(xml3d);
	var camera = this.camera;
	var dir = camera.getDirection();
	if (xml3d) {
		switch (KeyID) {
		case 38: // up
		case 87: // w
			camera.position = camera.position.add(dir.scale(this.getMoveScale()));
			break;
		case 39: // right
		case 68: // d
			camera.position.x -= dir.z * this.getMoveScale();
			camera.position.z += dir.x * this.getMoveScale();

			break;
		case 37: // left
		case 65: // a
			camera.position.x += dir.z * this.getMoveScale();
			camera.position.z -= dir.x * this.getMoveScale();

			break;
		case 40: // down
		case 83: // s
			camera.position = camera.position.subtract(dir.scale(this.getMoveScale()));
			break;

		default:
			return;
		}
		this.needUpdate = true;
	}
	this.preventDefault(e);
};

org.xml3d.Xml3dSceneController.prototype.createInput = function(inputName,
		panel) {
	panel.appendChild(document.createTextNode(inputName + ": "));
	var input = document.createElement("input");
	input.type = "text";
	input.style.width = "10em";
	input.name = inputName;
	panel.appendChild(input);
	panel.appendChild(document.createElement("br"));
	return input;
};

org.xml3d.Xml3dSceneController.prototype.updateInput = function() {
	if (this.inputPanel) {
		this.inputPosX.value = this.camera.position.x;
		this.inputPosY.value = this.camera.position.y;
		this.inputPosZ.value = this.camera.position.z;
		this.inputDirX.value = this.camera.direction.x;
		this.inputDirY.value = this.camera.direction.y;
		this.inputDirZ.value = this.camera.direction.z;
	}
};

org.xml3d.Xml3dSceneController.prototype.takeInput = function(e) {
	if (this.inputPanel) {
		this.camera.position.x = this.inputPosX.value;
		this.camera.position.y = this.inputPosY.value;
		this.camera.position.z = this.inputPosZ.value;
		this.camera.direction.x = this.inputDirX.value;
		this.camera.direction.y = this.inputDirY.value;
		this.camera.direction.z = this.inputDirZ.value;
		this.needUpdate = true;
		this.update();
	}
	this.preventDefault(e);
};

org.xml3d.Xml3dSceneController.prototype.setAnimation = function(active) {
	this.animation = active;
	this.xml3d.setAnimation(active);
};

org.xml3d.Xml3dSceneController.prototype.reset = function() {
	this.xml3d.reset();
	this.needUpdate = true;
};
