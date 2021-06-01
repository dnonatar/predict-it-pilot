SLIDER_H = 12;
SLIDER_KNOB = 12/2;

function Slider(svg, w, callback, value, vertical, h, c = 0, type = 'uncertainty')
{
	this.value = value || 0.5;
	this.svg = svg;
	this.w = w;
	this.h = h || SLIDER_H;
	this.vertical = vertical;
	this.c = c;	// current variate iteration
	this.type = type;

	this.rect = this.svg.append('rect')
		.style('stroke', 'none')
		.style('fill', 'white')
		.attr('width', this.w).attr('height', this.h);

	this.line = this.svg.append('line')
		.style('stroke', vertical ? 'none' : 'black')
		.style('stroke-width', '1px')
		.style('pointer-events', 'none')

		.attr('x1', vertical ? this.w/2  : 0).attr('x2', vertical ?  this.w/2  : w)
		.attr('y1', vertical ? 0 : this.h/2).attr('y2', vertical ? this.h : this.h/2);
	
	if (vertical){
		this.g = this.svg.append('g').attr('id','meanButton'.concat(c));
	}

	this.circle = this.svg.append('circle')
		.style('pointer-events', 'none')
		.style('fill', '#3b3b3b')
		.attr('r', SLIDER_KNOB)
		.attr('cx', vertical ? this.w/2  : this.value*w)
		.attr('cy', vertical ? this.h/2 : this.h/2)
		.attr('class', 'sliderButton')
		.attr('id',type.concat(c));
	
	this.callback = callback;

	(function(obj) {
		obj.rect
			.on('mousedown', function() 
			{
				if (obj.mousedownCallback) 
				{
					obj.mousedownCallback();
				}

				var m = d3.mouse(svg.node());
				obj.slideFunc(m);

				obj.circle.attr('r', SLIDER_KNOB+1)
				d3.select(document).on('mousemove.slider', function()
				{
					var m = d3.mouse(svg.node());
					obj.slideFunc(m);
				})

				d3.select(document).on('mouseup.slider', function() 
				{
					svg.select('circle.sliderButton').attr('r', SLIDER_KNOB)
					d3.select(document)
						.on('mousemove.slider', null)
						.on('mouseup.slider', null);
					if (obj.mouseupCallback) {
						obj.mouseupCallback();
					}
				});

			});
	})(this)
}

Slider.prototype.setCallback = function(_callback)
{
	this.callback = _callback
}

Slider.prototype.removeLine = function()
{
	if (this.line) {
		this.line.remove();
		this.line = null;
	}
}

Slider.prototype.setKnobColor = function(c)
{
	this.circle.style('fill', c);
}

Slider.prototype.slideFunc = function(mouse)
{
	var m = mouse;
	m[0] = Math.min(Math.max(m[0], 0), this.w);
	m[1] = Math.min(Math.max(m[1], 0), this.h);

	if (this.vertical)
	{
		this.circle
			.attr('cy', m[1]);
	}
	else 
	{
		this.circle
			.attr('cx', m[0]);
	}

	if (this.callback) {
		this.callback(this.vertical ? 1-m[1]/this.h : m[0]/this.w);
	}	
}

Slider.prototype.setValue = function(v) 
{
	this.value = v;
	if (!this.vertical) {
		this.circle.attr('cx', this.w*v);
	}
	else
	{
		this.circle.attr('cx', this.w*(1-v));

	}
}

Slider.prototype.mousedown = function(callback)
{
	this.mousedownCallback = callback;
}

Slider.prototype.mouseup = function(callback)
{
	this.mouseupCallback = callback;
}

Slider.prototype.addLabels = function(text1, text2)
{
	this.svg.append('text')
		.attr('x', -20)
		.attr('y', this.h/2)
		.html(text1)
}