var Y_SIGMA = 0.2;
var Y_SIGMA_MAX=.7;

var SLOPE = 0.2;
var SLOPE_SIGMA = 0.1;
var SLOPE_SIGMA_MAX = 0.5;


// number of points to sample
var SAMPLE_SIZE = 80;
var HOP_SAMPLE_RATE = 200;

function PredictScatter(svg, w, h)
{
	this.svg = svg;
	this.w = w;
	this.h = h;

	// slope
	this.slope = SLOPE;
	this.slopeSigma = SLOPE_SIGMA;

	// model
	this.linModel = new LinearBayes(this.slope, this.slopeSigma);
	this.linModel.updateY(0, Y_SIGMA);
	this.linModel.updateBeta(SLOPE, SLOPE_SIGMA)

	this.render();			
	this.adjustSlope();		// draw line
	this.addUI();			// sliders

	// add callback for hops
	
	(function(obj) {
		function createTimeout() {
			setTimeout(function() {
				obj.samplePoints();
				createTimeout();
			}, HOP_SAMPLE_RATE)
		}
		createTimeout();
		
	})(this)
	
}


PredictScatter.prototype.addUI = function()
{
	var g1 = this.svg.append('g');
	var g2 = this.svg.append('g');

	g1.attr('transform', 'translate(' + (this.w + 10) + ',20)');
	g2.attr('transform', 'translate(' + (this.w + 10) + ',40)');

	/*
	this.svg.append('text')
		.attr('x', this.w+10).attr('y', 10)
		.html("How confident are you in the slope?");
	*/

	this.svg.append('text')
		.attr('x', this.w+10).attr('y', 10)
		.html("How strong do you think the relationship is?");

	(function(obj)
	{
		/*
		var sliderSlope = new Slider(g1, 70, function(value) 
		{
			obj.slopeSigma = value * (SLOPE_SIGMA_MAX-0.001)+0.001;
			obj.linModel.updateBeta(obj.slope, obj.slopeSigma);
			obj.sampleSlopes();
		});
		sliderSlope.mousedown(function(){obj.sampleSlopes()});
		sliderSlope.mouseup(function(){obj.sampleSlopes(false)});
		sliderSlope.setValue(SLOPE_SIGMA);
		*/
		
		var sliderUncertainty = new Slider(g2, 270, function(value) 
		{
			obj.slopeSigma = value*(Y_SIGMA_MAX-0.001)+0.001;
			obj.linModel.updateY(0, obj.slopeSigma);
			//obj.samplePoints();
		})
		sliderUncertainty.setValue(Y_SIGMA/(Y_SIGMA_MAX-0.001));
	})(this);

}

PredictScatter.prototype.render = function()
{
	this.background = this.svg.append('rect')
		.attr('width', this.w)
		.attr('height', this.h)
		.style('fill', 'white');

	this.sampleGroup = this.svg.append('g');
	this.betaSampleGroup = this.svg.append('g');

	var xAxis = this.svg.append('line').classed('axis', true);
	var yAxis = this.svg.append('line').classed('axis', true);

	xAxis
		.style('stroke', 'black')
		.style('stroke-width', '1px')
		.attr('x1', 0).attr('x2', this.w)
		.attr('y1', this.w).attr('y2', this.w);

	yAxis
		.style('stroke', 'black')
		.style('stroke-width', '1px')
		.attr('x1', 0).attr('x2', 0)
		.attr('y1', 0).attr('y2', this.h)

	this.xAxis = xAxis;
	this.yAxis = yAxis;

	this.xScale = d3.scaleLinear()
		.domain([-2, 2]).range([0, this.w])
	this.yScale = d3.scaleLinear()
		.domain([-2, 2]).range([this.h, 0]);

	// create correlation line
	this.corLine = this.svg.append('line')
		.style('pointer-events', 'none')
		.style('stroke', 'red')
		.style('stroke-width', '2px');
	this.corLine
		.classed('correlation', true);
		
	(function(obj) {
		obj.background.on('mousedown', function() 
		{
			if (obj.updatingSlopeSigma) {
				return;
			}
			var m = d3.mouse(obj.svg.node());
			obj.m = m;
			d3.select(document).on('mousemove', function() 
			{
				var SLOPE_RATE = 0.01;
				var newM = d3.mouse(obj.svg.node());
				var yDiff = newM[1]-obj.m[1];
				if (newM[0] > obj.w/2) {
					yDiff *= -1
				}

				obj.slope += yDiff * SLOPE_RATE;
				if (obj.slope > 0.99) {
					obj.slope = 0.99;
				}
				else if (obj.slope < -0.99)
				{
					obj.slope = -0.99;
				}
				obj.m = newM;
				obj.adjustSlope();
			});

			d3.select(document).on('mouseup', function() 
			{
				d3.select(document).on('mousemove', null);
				d3.select(document).on('mouseup', null);
				obj.m = d3.mouse(obj.svg.node());

				// now allow adjusting uncertainty
				//obj.adjustSlopeSigma()


			});
		});
	})(this);
}

PredictScatter.prototype.adjustSlope = function()
{
	var x1 = -1.8;
	var x2 = +1.8;
	var y1 = this.slope * x1;
	var y2 = this.slope * x2;

	this.corLine
		.attr('x1', this.xScale(x1)).attr('x2', this.xScale(x2))
		.attr('y1', this.yScale(y1)).attr('y2', this.yScale(y2));

	// adjust model
	this.adjustModel();
}

PredictScatter.prototype.adjustModel = function()
{
	this.linModel.updateBeta(this.slope, this.slopeSigma);
	//this.samplePoints();
}

PredictScatter.prototype.samplePoints = function()
{
	var R = SAMPLE_SIZE;
	
	// sample x values uniformly
	var xsamples = [];
	for (var i=0; i<R; i++) {
		xsamples.push(2*1.9*(Math.random()-.5))
	}

	// sample y values
	var ysamples = this.linModel.sample(xsamples);

	// merge
	var samples = [];
	for (i=0; i<R; i++) 
	{
		samples.push({x: xsamples[i], y: ysamples[i]});
	}

	// filter samples
	/*
	samples = samples.filter(function(d) {
		return d.x >= -1.99 && d.x <= 1.99 && d.y >= -1.99 && d.y <= 1.99;
	});
	*/

	// create circles
	var selection = this.sampleGroup.selectAll('circle').data(samples);
	selection.exit().remove();
	selection = selection.enter().append('circle')
		.style('fill', "#cccccc")
		.attr('r', '3')
		.merge(selection);

	(function(_sel, obj) 
	{
		_sel
			.attr('cx', function(d) { return obj.xScale(d.x); })
			.attr('cy', function(d) { return obj.yScale(d.y); });

	})(selection, this);
}

PredictScatter.prototype.sampleSlopes = function(turnon)
{
	/*
	this.updatingSlopeSigma = true;
	(function(obj)
	{
		d3.select(document).on('mousemove', function() 
		{
			var RATE = .005;
			var newM = d3.mouse(obj.svg.node());
			var yDiff = newM[1]-obj.m[1];
			obj.slopeSigma += yDiff * RATE;
			if (obj.slopeSigma < 0.005) {
				obj.slopeSigma = 0.005;
			}
			else if (obj.slopeSigma > 0.4) {
				obj.slopeSigma = 0.4;
			}
			obj.m = newM;

			obj.linModel.updateBeta(obj.slope, obj.slopeSigma);
			obj.adjustSlopeSigma();
		});

		d3.select(document).on('mousedown', function() {
			d3.select(document).on('mousemove', null);
			d3.select(document).on('mousedown', null);
			obj.betaSampleGroup.selectAll('line').remove();
			obj.updatingSlopeSigma = false;

		});
	})(this);
	*/
	
	if (turnon===false) {
		this.betaSampleGroup.selectAll('line.slopeReplicates').remove();
		return;
	}
	R = 40;	// number of lines
	var slopeSamples = this.linModel.sampleBetas(R);
	var intercepts = this.linModel.sampleAlphas(R);

	var lines = [];
	for (var i=0; i<R; i++) 
	{
		// create lines within these samples
		lines.push({
			x1: this.xScale(-1.8), y1: this.yScale(-1.8*slopeSamples[i] + (intercepts?intercepts[i]:0)),
			x2: this.xScale(+1.8), y2: this.yScale(+1.8*slopeSamples[i] + (intercepts?intercepts[i]:0))
		});

		var sel = this.betaSampleGroup.selectAll('line').data(lines);
		sel = sel.enter().append('line')
			.style('pointer-events', 'none')
			.style('stroke', 'red')
			.style('stroke-width', '1px')
			.style('opacity', .2)
			.attr('class', 'slopeReplicates')
			.merge(sel);
		sel
			.attr('x1', function(d) { return d.x1})
			.attr('x2', function(d) { return d.x2})
			.attr('y1', function(d) { return d.y1})
			.attr('y2', function(d) { return d.y2})
	}

	//this.samplePoints();
}

//////////////////////////////
/////////////	bar chart
///////////////////////////////

/* Multi-variate "bar" chart */

function PredictMultivariate(svg, w, h, variates)
{
	this.svg = svg;
	this.w = w;
	this.h = h;
	this.variates = variates;

	// model
	this.linModel = new MultivariateLinear(variates, 0, 0.5);
	this.linModel.updateY(0, Y_SIGMA);   // (mean, sd)

	this.render();
	this.addUI();		// belief elicitation

	// add callback for hops
	
	(function(obj) {
		function createTimeout() {
			setTimeout(function() {
				obj.samplePoints();
				createTimeout();
			}, HOP_SAMPLE_RATE)
		}
		createTimeout();
		
	})(this);
	
}

var MULTIVAR_X_PAD = 30;
var MULTIVAR_MINMAX = 1.7;
var MULTIVAR_W = 50;

PredictMultivariate.prototype.render = function()
{

	this.background = this.svg.append('rect')
		.attr('width', this.w)
		.attr('height', this.h)
		.style('fill', 'white');

	this.sampleGroup = this.svg.append('g');
	this.coefSampleGroup = this.svg.append('g');
	this.meanIndicator = this.svg.append('g');

	var xAxis = this.svg.append('line').classed('axis', true);
	var yAxis = this.svg.append('line').classed('axis', true);

	xAxis
		.style('stroke', 'black')
		.style('stroke-width', '1px')
		.attr('x1', 0).attr('x2', this.w)
		.attr('y1', this.w).attr('y2', this.w);

	yAxis
		.style('stroke', 'black')
		.style('stroke-width', '1px')
		.attr('x1', 0).attr('x2', 0)
		.attr('y1', 0).attr('y2', this.h)

	this.xAxis = xAxis;
	this.yAxis = yAxis;

	h = 4 - 2 * (2-MULTIVAR_MINMAX)		//formula comes from the later part below
	slider_height = this.h * h / 4
	
	this.yScale = d3.scaleLinear()
		.domain([-2, 2]).range([slider_height, 0]);
}

PredictMultivariate.prototype.samplePoints = function()
{
	var R = SAMPLE_SIZE;
	// sample x values uniformly
	var xsamples_set = [];
	//var xsamples = [];
	for (var j=0; j < this.variates; j++){
		var xsamples = [];
		for (var i=0; i<R; i++) {
			
			current_mean = j * this.w / this.variates + (MULTIVAR_W / 2) + 10
			current_max  = current_mean + 20
			current_min  = current_mean - 20

			//xsamples.push(Math.random() * (current_max - current_min) + current_min )	
			xsamples.push(Math.random() * (45 - 5) + 5) // x would be between 5 and 45, with center at 25
		}
		xsamples_set.push(xsamples)
		
	}
	// sample y values
	// ysamples is an array of arrays
	var ysamples_set = this.linModel.sample(R);

	// merge
	var samples_set = [];
	for (var j=0; j < this.variates; j++){
		current_xsamples = xsamples_set[j]
		current_ysamples = ysamples_set[j]
		var samples = [];
		for (i=0; i<R; i++) 
		{
			samples.push({x: current_xsamples[i], y: current_ysamples[i]});
		}
		samples_set.push(samples)
	}

	// create circles
	d3.selectAll('.datapoints').remove()	// remove g from the previous sampling
	for (var j=0; j < this.variates; j++){

		this_samples = samples_set[j]
		//var selection = this.sampleGroup.selectAll('circle').data(this_samples);
		
		//var selection = this.svg.append('g').attr('class','datapoints').selectAll('circle').data(this_samples);
		//var selection = d3.select('#mean_indicator_'.concat(j)).append('g').attr('class','datapoints').selectAll('circle').data(this_samples);
		var selection = d3.select('#meanButton'.concat(j)).append('g').attr('class','datapoints').selectAll('circle').data(this_samples);
		
		selection.exit().remove();
		selection = selection.enter().append('circle')
			.style('fill', "#cccccc")
			.attr('r', '3')
			//.attr('class','datapoints')
			.merge(selection);

		(function(_sel, obj) 
		{
			_sel
				.attr('cx', function(d) { return d.x; })
				.attr('cy', function(d) { return obj.yScale(d.y); });

		})(selection, this);
	
	}

	
}


PredictMultivariate.prototype.addUI = function()
{
	var g1 = this.svg.append('g');

	g1.attr('transform', 'translate(' + (this.w + 10) + ',40)');

	this.svg.append('text')
		.attr('x', this.w+10).attr('y', 10)
		.html("How confident are you in the average?");
	
	(function(obj)
	{		
		var sliderUncertainty = new Slider(g1, 270, function(value) 
		{
			obj.Sigma = value*(Y_SIGMA_MAX-0.0001)+0.001;
			obj.linModel.updateY(0, obj.Sigma);			
			//obj.samplePoints();
			
		})
		sliderUncertainty.setValue(Y_SIGMA/(Y_SIGMA_MAX-0.001));
		
	})(this);

	// create mean indicators
	
		
	for (var i=0; i<this.variates; i++) 
	{
		
		(function(obj)
		{
			//var x = i*((this.w-MULTIVAR_X_PAD*2) / (this.variates-1));
			//var x = i*((obj.w-MULTIVAR_X_PAD*2) / (obj.variates));

			var x = i*((obj.w) / (obj.variates)) + 10;

			var y = obj.yScale(MULTIVAR_MINMAX);

			var g = obj.svg.append('g').attr('id','mean_indicator_'.concat(i));
			g.attr('transform', 'translate(' + x + ',' + y + ')');

			var h = 4 - 2*(2-MULTIVAR_MINMAX)
			var sliderMean = new Slider(g, MULTIVAR_W, function(value){
				var sampleInterpolate = d3.interpolateNumber(-2, 2)	// convert mean slider range of [0,1] to samples range of [-2,2]
				new_mean = sampleInterpolate(value)	
				current_sigma = obj.linModel.coefs[this['c']]['sigma']
				obj.linModel.coefs[this['c']] = new dnorm(new_mean, current_sigma)
				
			}
			, 0.5, true, obj.h * h / 4, c=i, type='mean_indicator')	// c is the current variate
			sliderMean.setValue(0.5);
			
		})(this);
	}
}


