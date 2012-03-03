// Adapter for <group>
(function() {
	
	var updateTransformAdapter = function(me) {
		// setup new and register listener
		var tname = me.node.transform;
		var tnode = xml3d.URIResolver.resolve(tname);
		me.transformAdapter = me.factory.getAdapter(tnode);

	};
	
	
	var XML3DGroupRenderAdapter = function(factory, node) {
	    xml3d.webgl.RenderAdapter.call(this, factory, node);
	    this.processListeners();
	    this.factory = factory;
	    this.parentTransform = null;
	    this.parentShader = null;
	    this.parentVisible = true;
	    this.isValid = true;
	    this.updateTransformAdapter();
	};

	xml3d.createClass(XML3DGroupRenderAdapter, xml3d.webgl.RenderAdapter);

	var p = XML3DGroupRenderAdapter.prototype;

	p.applyTransformMatrix = function(
			transform) {
		var ret = transform;

		if (this.parentTransform !== null)
			ret = mat4.multiply(ret, this.parentTransform, mat4.create());

		if (this.transformAdapter)
			ret = mat4.multiply(ret, this.transformAdapter.getMatrix(), mat4.create());

		return ret;
	};
	
	p.updateTransformAdapter = function() {
		var tNode = this.node.transform;
	    tNode = xml3d.URIResolver.resolve(tNode);
	    if (tNode)
	    	this.transformAdapter = this.factory.getAdapter(tNode);
	};

	p.processListeners  = function() {
	    var attributes = this.node.attributes;
	    for (var index in attributes) {
	        var att = attributes[index];
	        if (!att.name)
	            continue;

	        var type = att.name;
	        if (type.match(/onmouse/) || type == "onclick") {
	            var eventType = type.substring(2);
	            this.node.addEventListener(eventType, new Function("evt", att.value), false);
	        }
	    }
	};

	p.notifyChanged = function(evt) {
		if (evt.type == 0) {
			// Node insertion is handled by the CanvasRenderAdapter
			return;
		}
		else if (evt.type == 2) {
			this.factory.renderer.sceneTreeRemoval(evt);
			return;
		}
		
		var target = evt.internalType || evt.attrName || evt.wrapped.attrName;
		
		switch (target) {
		case "shader":
			//Update this group node's shader then propagate the change down to its children
			var downstreamValue = this.getShader();
	        evt.internalType = "parentshader";
	        evt.newValue = downstreamValue;
	        this.notifyChildren(evt);

	        this.factory.renderer.requestRedraw("Group shader changed.", false);
	        break;
	        
		case "parentshader":
			this.parentShader = null;		
			if (!this.getShader()) { // This node's shader would override parent shaders
				this.notifyChildren(evt);
			}
			this.parentShader = evt.newValue;
			break;
			
		case "translation":
		case "rotation":
		case "scale":
			//This group adapter's transform node was changed
			var downstreamValue = this.transformAdapter.getMatrix();
			if (this.parentTransform)
				downstreamValue = mat4.multiply(downstreamValue, this.parentTransform);
			
			evt.internalType = "parenttransform";
			evt.newValue = downstreamValue;
			this.notifyChildren(evt);
			break;
			
		case "transform":
			//This group is now linked to a different transform node. We need to notify all
			//of its children with the new transformation matrix

			this.updateTransformAdapter(this);

			var downstreamValue;
			if (this._transformAdapter)
				downstreamValue = this.transformAdapter.getMatrix();
			else if (this.parentTransform)
				downstreamValue = mat4.identity(mat4.create());
			else
				downstreamValue = null;

			if(this.parentTransform)
				downstreamValue = mat4.multiply(downstreamValue, this.parentTransform);

	        evt.internalType = "parenttransform";
	        evt.newValue = downstreamValue;
	        
	        this.notifyChildren(evt);
			this.factory.renderer.requestRedraw("Group transform changed.", true);
			break;
		
		//TODO: this will change once the wrapped events are sent to all listeners of a node
		case "parenttransform":  
			var downstreamValue = evt.newValue;
			if (this.parentTransform)
				downstreamValue = mat4.multiply(downstreamValue, this.parentTransform);

			evt.newValue = downstreamValue;
			this.notifyChildren(evt);
			break;
			
		case "visible":
			//If this node is set visible=false then it overrides the parent node 
			if (this.parentVisible == false)
				break;
			else {
				evt.internalType = "parentvisible";
				evt.newValue = evt.wrapped.newValue == "true";
				this.notifyChildren(evt);
				this.factory.renderer.requestRedraw("Group visibility changed.", true);	
			}
			break;
		
		case "parentvisible":
			this.parentVisible = evt.newValue;
			//If this node is set visible=false then it overrides the parent node 
			if (this.node.visible == false)
				break;
			else
				this.notifyChildren(evt);
			
			break;
			
		default:
			xml3d.debug.logWarning("Unhandled mutation event in group adapter for parameter '"+target+"'");
			break;
		};

	};


	p.notifyChildren = function(evt) {
		var child = this.node.firstElementChild;
		while (child) {
			var adapter = this.factory.getAdapter(child);
			adapter.notifyChanged(evt);
			child = child.nextElementSibling;
		}
	};

	p.getShader = function()
	{
		var shader = this.node.shader;

		// if no shader attribute is specified, try to get a shader from the style attribute
		if(shader == "")
		{
			var styleValue = this.node.getAttribute('style');
			if(styleValue) {		
				var pattern    = /shader\s*:\s*url\s*\(\s*(\S+)\s*\)/i;
				var result = pattern.exec(styleValue);
				if (result)
					shader = this.node.xml3ddocument.resolve(result[1]);
			}
		} else {
			shader = xml3d.URIResolver.resolve(shader);
		}
		
		shader = this.factory.getAdapter(shader);
		
		return shader || this.parentShader;	
	};

	p.destroy = function() {
		var child = this.node.firstElementChild;
		while (child) {
			var adapter = this.factory.getAdapter(child);
			if (adapter && adapter.destroy)
				adapter.destroy();
			child = child.nextElementSibling;
		}
		
		this.isValid = false;
	};

	p.getBoundingBox = function() {
	    var bbox = new XML3DBox();
	    Array.prototype.forEach.call(this.node.childNodes, function(c) {
	        if(c.getBoundingBox)
	            bbox.extend(c.getBoundingBox());
	    });
	    if (this._transformAdapter) {
	        xml3d.webgl.transformAABB(bbox, this._transformAdapter.getMatrix());
	    }
	    return bbox;
    };

	xml3d.webgl.XML3DGroupRenderAdapter = XML3DGroupRenderAdapter;
}());
