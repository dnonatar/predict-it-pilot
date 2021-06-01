var SQRT_2PI = Math.sqrt(2 * Math.PI);
var LOG_SQRT_2PI = Math.log(SQRT_2PI);

function mean(arr)
{
	var m=0;
	for (var i=0, len=arr.length; i<len; i++)
	{
		m += arr[i];
	}
	return m/arr.length;
}
function std(arr)
{
	var m = mean(arr);
	var sigma = 0;
	for (var i=0, len=arr.length; i<len; i++) {
		sigma += Math.pow(arr[i]-m, 2)
	}
	return Math.sqrt(sigma/arr.length)
}
function box_muller(_sigma) 
{
	var sigma = _sigma || 1;
	var u = 0, v = 0;
	while(u === 0) u = Math.random(); //Converting [0,1) to (0,1)
	while(v === 0) v = Math.random();
	var ln = Math.sqrt( -2.0 * Math.log( u ) );
	return ln * Math.cos( 2.0 * Math.PI * v ) * sigma;
}

function dnorm(mean, sigma)
{
	this.mean = mean;
	this.sigma = sigma;
	this.variance = sigma*sigma;
	this.twiceVariance = 2 * this.variance;

	this.denom = 1/(sigma * SQRT_2PI);
	this.logDenom = Math.log(this.denom);
}

dnorm.prototype.pdf = function(x)
{
	var e = Math.pow(x-mean, 2) / this.twiceVariance;
	return this.denom * Math.exp(e)
}

dnorm.prototype.logPdf = function(x)
{
	var e = Math.pow(x-this.mean, 2) / this.twiceVariance;
	return this.logDenom - e;
}

dnorm.prototype.sample = function(r)
{
	var rs = [];
	var mean = this.mean;
	var sigma = this.sigma;
	for (var i=0; i<r; i++) 
	{
		rs.push(box_muller(sigma) + mean);
		//rs.push(box_muller(sigma) + 2);
	}
	return rs;
}

dnorm.prototype.oneSample = function()
{
	return box_muller(this.sigma) + this.mean;
}

function dnormLog(x, mean, sigma)
{
	var variance = sigma*sigma;
	var logDenom = Math.log(sigma) + LOG_SQRT_2PI;
	var e = Math.pow(x-mean, 2) / (2*variance);

	return -logDenom + e;
}

/* implements a linear y = a + bx */
function LinearBayes(_betaMu, _betaSigma)
{
	// y ~ dnorm(mu, 0.5)
	// mu ~ 0 + dnorm(0, 0.5) * x
	this.alpha = new dnorm(0, 0.075);
	this.beta = new dnorm(_betaMu, _betaSigma || 0.5);
	this.y = new dnorm(0, 0.5);
}

LinearBayes.prototype.updateBeta = function(_betaMu, _betaSigma)
{
	this.beta = new dnorm(_betaMu, _betaSigma || 0.5);
}
LinearBayes.prototype.updateY = function(_yMu, _ySigma)
{
	this.y = new dnorm(_yMu, _ySigma);
}

LinearBayes.prototype.sampleBetas = function(r)
{
	var betas = this.beta.sample(r);
	return betas;
}

LinearBayes.prototype.sampleAlphas = function(r)
{
	if (this.alpha) {
		return this.alpha.sample(r)
	}
	else
	{
		return null;
	}
}

LinearBayes.prototype.sample = function(x)
{	
	var betas = this.beta.sample(x.length)
	var rs = [];
	for (i=0, len=betas.length; i<len; i++) 
	{
		var y = this.y.oneSample();
		var yy = y + x[i] * betas[i];
		if (this.alpha) {
			yy += this.alpha.oneSample();
		}
		rs.push(yy);
	}
	return rs;
}


///////////////////////////////////////////////////////////////////////

/* -----------------------------
 * Multivariate linear
 * ----------------------------- */

function MultivariateLinear(varCount, sigma)
{
	LinearBayes.call(this);
	this.varCount = varCount;
	this.coefs = [];
	for (var i=0; i<varCount; i++)
	{
		//this.coefs.push(new dnorm(mean || 0, sigma || 0.5));
		this.coefs.push(new dnorm(0, sigma || 0.005));
	}
	this.y = new dnorm(0 , 0.5);
	//this.y = new dnorm(mean || 0, 0.5);
}
MultivariateLinear.prototype = Object.create(LinearBayes.prototype)

// This function returns an array containing varCount number of arrays.
// Each subarray contains samples for each var
// s and ys are sampled using the dnorm.sample function
MultivariateLinear.prototype.sample = function(r)
{
	var samples = [];
	for (var i=0; i<this.coefs.length; i++) {
		var s = this.coefs[i].sample(r);
		var ys = this.y.sample(r);
		for (var j=0; j<r; j++) {
			s[j] += ys[j];
		}
		samples.push(s);
	}
	return samples;
}
