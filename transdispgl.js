/* Transform Display (WeblGL version)     Andrew Desharnais     Hurricane Electric

	To use:
	...
*/

var tdv = new Object();

function td_init()
{
	// Init width, height, and camera angle
	tdv.width = 500;
	tdv.height = 400;
	tdv.theta = -Math.PI/4;
	tdv.phi = -Math.PI/3;

	// Create and init canvas
	$("#transformationdisplay").append("<canvas id=\"td_canvas\" width=\""+tdv.width+"\" height=\""+tdv.height+"\"></canvas>");
	$("#transformationdisplay").append("<br>Click and drag to rotate");
	c = document.getElementById('td_canvas');
	var cj = $("#td_canvas");
	cj.css("border","1px solid #000000");

	// Add clock ui
	if(1) // FLAG add some sort of option to determine if animations allowed or not
	{
		$("#td_canvas").after("<div id=\"td_clockui\" style=\"border-radius:10px;display:inline-block;width:250px;height:150px;background-color:red;margin-left:30px;\"></div>");
		$("#td_clockui").append("Animation Time:");
		$("#td_clockui").append("<input id=\"td_clockuit\" type=\"test\" style=\"width:40px;\" value=\"1\"/><br><br>");
		$("#td_clockui").append("Loop Animation:");
		$("#td_clockui").append("<input id=\"td_clockuil\" type=\"checkbox\"/><br><br>");
		$("#td_clockui").append("&nbsp;<button id=\"td_clockuis\" style=\"width:60px;\">Start</button> ");
		$("#td_clockui").append("<button id=\"td_clockuir\">Reset</button>");
		$("#td_clockui").append("<div id=\"td_clockuii\"style=\"background-color:#ffffdd;margin-left:20px;border-style:solid;border-radius:7px;width:1em;height:1em;text-align:center;cursor:default;\"><b>?</b></div>");
		$("#td_clockuii").attr("title","If you'd like to see an animated transformation, use the letter 't' as a value in the cells of the matrices below to represent animation phase. When you hit \"Start\", the value of 't' will shift from 0 to 1 over the course of the animation.\n\"Animation Time\" determines how long, in seconds, an animation takes.\n\"Loop Animation\" determines if animation repeats, or just executes once and then stops.\nPress \"Start\" to start an animation.\nPress \"Reset\" to stop an animation and set 't' to zero.");
	}

	// Make Grid
	tdv.grid = td_makegrid(5);

	// Mouse interaction
	$("#td_canvas").mousedown(function()
	{
		tdv.moused = true;
		tdv.mousex = -1;
		tdv.mousey = -1;
	});
	$("#td_canvas").mouseup(function(){tdv.moused = false;});
	$("#td_canvas").mouseleave(function(){tdv.moused = false;});
	$("#td_canvas").mousemove(function(e)
	{
		if(tdv.moused)
		{
			if(tdv.mousex==-1){tdv.mousex=e.pageX;tdv.mousey=e.pageY;}
			tdv.theta+= 2*(e.pageX-tdv.mousex)/tdv.height;
			tdv.phi+= 2*(e.pageY-tdv.mousey)/tdv.height;
			tdv.mousex = e.pageX;
			tdv.mousey = e.pageY;
			td_setproj();
			td_render();
		}
	});

	// Initialize webgl
	tdv.modmat = new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]);
	tdv.tarmat = new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]);
	tdv.projrad = 7;
	td_setproj();
	tdv.model = td_makemodel();
	td_glinit();

	// FLAG temp
	//td_settar(new Float32Array([1,0,0,0, 0,1,0,0, 0,0,.7,0, 2,3,0,1]));
}

function td_settar(am)
{
	tdv.tarmat = td_matmult(am, new Array(1.05,0,0,0, 0,1.05,0,0, 0,0,1.05,0, 0,0,0,1));
	td_render();
}	

function td_update(am,pm) // called by matmult
{
	tdv.modmat = am;
	if(pm) tdv.projmat = pm;
	td_render();
}

function td_render()
{
	// Generate and pass matrix
	var tmat = tdv.projmat;

	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	// Draw grid

	gl.useProgram(edgeprogram);

	edgeprogram.testhandle = gl.getUniformLocation(edgeprogram, "test");
	edgeprogram.colhandle = gl.getUniformLocation(edgeprogram, "col");
	edgeprogram.bcolhandle = gl.getUniformLocation(edgeprogram, "bcol");

	gl.uniformMatrix4fv(edgeprogram.testhandle,false,tmat);
	gl.uniform3f(edgeprogram.colhandle, 0.3, 0.3, 0.3);
	gl.uniform3f(edgeprogram.bcolhandle, 0.7, 0.7, 0.7);

	td_drawedges(tdv.grid, 1);

	gl.uniform3f(edgeprogram.colhandle, 1.0, 0.0, 0.0);
	gl.uniform3f(edgeprogram.bcolhandle, 0.6, 0.0, 0.0);
	td_drawedges(tdv.grid.xaxis, 2);
	gl.uniform3f(edgeprogram.colhandle, 0.0, 1.0, 0.0);
	gl.uniform3f(edgeprogram.bcolhandle, 0.0, 0.6, 0.0);
	td_drawedges(tdv.grid.yaxis, 2);
	gl.uniform3f(edgeprogram.colhandle, 0.0, 0.0, 1.0);
	gl.uniform3f(edgeprogram.bcolhandle, 0.0, 0.0, 0.6);
	td_drawedges(tdv.grid.zaxis, 2);

	// Draw Model
	tmat = td_matmult(tdv.projmat,tdv.modmat);
	gl.uniformMatrix4fv(edgeprogram.testhandle,false,tmat);

	gl.uniform3f(edgeprogram.colhandle, 0.3, 0.3, 0.3);
	gl.uniform3f(edgeprogram.bcolhandle, 0.8, 0.8, 0.8);
	td_drawedges(tdv.model,2);

	gl.useProgram(triaprogram);
	triaprogram.testhandle = gl.getUniformLocation(triaprogram, "test");
	gl.uniformMatrix4fv(triaprogram.testhandle,false,tmat);

	triaprogram.colhandle = gl.getUniformLocation(triaprogram, "col");
	triaprogram.bcolhandle = gl.getUniformLocation(triaprogram, "bcol");
	gl.uniform3f(triaprogram.colhandle, 0.83, 0.88, 0.88);
	gl.uniform3f(triaprogram.bcolhandle, 0.83, 0.88, 0.88);

	td_drawtris(tdv.model);

	// Draw Target
	tmat = td_matmult(tdv.projmat,tdv.tarmat);
	gl.useProgram(edgeprogram);
	gl.uniformMatrix4fv(edgeprogram.testhandle,false,tmat);

	gl.uniform3f(edgeprogram.colhandle, 0.8, 0.0, 0.0);
	gl.uniform3f(edgeprogram.bcolhandle, 1.0, 0.0, 0.0);
	td_drawedges(tdv.model,2);

	/*gl.useProgram(triaprogram);
	triaprogram.testhandle = gl.getUniformLocation(triaprogram, "test");
	gl.uniformMatrix4fv(triaprogram.testhandle,false,tmat);

	triaprogram.colhandle = gl.getUniformLocation(triaprogram, "col");
	gl.uniform3f(triaprogram.colhandle, 1.00, 0.00, 0.00);

	td_drawtris(tdv.model);*/

}

function td_drawtris(model)
{

	// Pass vertices
	vertexPosBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, vertexPosBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, model.verts, gl.STATIC_DRAW);
	triaprogram.vertexPosAttrib = gl.getAttribLocation(triaprogram, 'pos');
	gl.enableVertexAttribArray(triaprogram.vertexPosAttrib);
	gl.vertexAttribPointer(triaprogram.vertexPosAttrib, 3, gl.FLOAT, false, 0, 0);

	/*
	// Pass texture coords
	textPosBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, textPosBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, model.texts, gl.STATIC_DRAW);
	triaprogram.tpos = gl.getAttribLocation(triaprogram, 'tex');
	gl.enableVertexAttribArray(triaprogram.tpos);
	gl.vertexAttribPointer(triaprogram.tpos, 2, gl.FLOAT, false, 0, 0);

	// Pass texture
	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, tdv.text1);
	gl.uniform1i(gl.getUniformLocation(triaprogram, "uSampler"), 0);
*/
	// Pas time
	triaprogram.timehandle = gl.getUniformLocation(triaprogram, "time");
	gl.uniform1f(triaprogram.timehandle, tdv.time);

	// Pass indices
	indices = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indices);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, model.trias, gl.STATIC_DRAW);

	// Draw
	gl.drawElements(gl.TRIANGLES, model.trial, gl.UNSIGNED_SHORT, 0);
}

function td_drawedges(model, width)
{

	// Check for width
	if(!width) width = 1;

	// Pass vertices
	vertexPosBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, vertexPosBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, model.verts, gl.STATIC_DRAW);
	edgeprogram.vertexPosAttrib = gl.getAttribLocation(edgeprogram, 'pos');
	gl.enableVertexAttribArray(edgeprogram.vertexPosAttrib);
	gl.vertexAttribPointer(edgeprogram.vertexPosAttrib, 3, gl.FLOAT, false, 0, 0);
	indices = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indices);

	gl.lineWidth(width);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, model.edges, gl.STATIC_DRAW);
	gl.drawElements(gl.LINES, model.edgel, gl.UNSIGNED_SHORT, 0);
}


// Once off functions:

function td_glinit()
{

	// Initialize webgl and set shaders
	gl = c.getContext('experimental-webgl');
	gl.enable(gl.DEPTH_TEST);
	gl.depthFunc(gl.LEQUAL);

	// Textured globe shader
	var vs;
	var fs;

	// Triangle shader
	vs = ""+
	"attribute vec3 pos;"+
	"attribute vec2 tex;"+
	"varying float z;"+
	"varying highp vec2 texture;"+
	"varying vec3 posf;"+
	"uniform mat4 test;"+
	"void main()"+
	"{"+
	"	posf = pos;"+
	"	gl_Position = test*vec4(pos, 1);"+
	"	z = gl_Position[2]/gl_Position[3];"+
	"	texture = tex;"+
	"}";

	fs = ""+
	"precision mediump float;"+
	"varying vec3 posf;"+
	"vec3 posv;"+
	"uniform vec3 col;"+
	"uniform vec3 bcol;"+
	"uniform float time;"+
	"varying float z;"+
	"vec3 color;"+
	"uniform sampler2D uSampler;"+
	""+
	"void main()"+
	"{"+
	//"	color = col;"+
	//"	mix(vec3(1.0, 1.0, 1.0), (3.0*z+2.0)*0.25);"+
	//"	mix(vec3(0.0, 0.0, 0.0), (3.0*z+2.0)*0.25);"+ // altshade
	//"	gl_FragColor = vec4(color, 1.0);"+
	"	float t = 0.5-z*0.5;"+
	"	float bt = 1.0-t;"+
	"	gl_FragColor = vec4(col*t+bcol*bt, 1.0);"+
	"}";

	triaprogram = td_createProgram(vs,fs);

	// Edge shader
	vs = ""+
	"attribute vec3 pos;"+
	"varying float z;"+
	"uniform mat4 test;"+
	"void main()"+
	"{"+
	"	gl_Position = test*vec4(pos, 1);"+
	"	z = gl_Position[2]/gl_Position[3];"+
	"}";

	fs = ""+
	"precision mediump float;"+
	"uniform vec3 col;"+
	"uniform vec3 bcol;"+
	"varying float z;"+
	"void main()"+
	"{"+
	"	float t = 0.5-z*0.5;"+
	"	float bt = 1.0-t;"+
	"	gl_FragColor = vec4(col*t+bcol*bt, 1.0);"+
	"}";

	edgeprogram = td_createProgram(vs,fs);

	// Initialize globe texture
	tdv.text1 = gl.createTexture();
	tdv.image1 = new Image();
	tdv.image1.onload = function()
	{
		gl.bindTexture(gl.TEXTURE_2D, tdv.text1);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, tdv.image1);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
		gl.generateMipmap(gl.TEXTURE_2D);
		gl.bindTexture(gl.TEXTURE_2D, null);
	}

}

function td_createProgram(vstr, fstr) {
	var program = gl.createProgram();
	var vshader = td_createShader(vstr, gl.VERTEX_SHADER);
	var fshader = td_createShader(fstr, gl.FRAGMENT_SHADER);
	gl.attachShader(program, vshader);
	gl.attachShader(program, fshader);
	gl.linkProgram(program);
	return program;
}

function td_createShader(str, type) {
	var shader = gl.createShader(type);
	gl.shaderSource(shader, str);
	gl.compileShader(shader);
	return shader;
}

function td_makegrid(rad)
{
	var model = new Object();

	var i,j,temp;

	var width = rad*2+1;
	model.vertl = 3*(width*4-4);
	model.verts = new Float32Array(model.vertl);
	for(i=0;i<width;i++)
	{
		model.verts[3*(i)+0] = i-rad;
		model.verts[3*(i)+1] = -rad;
		model.verts[3*(i)+2] = 0;
		model.verts[3*(i+width)+0] = i-rad;
		model.verts[3*(i+width)+1] = rad;
		model.verts[3*(i+width)+2] = 0;
	}
	for(i=0;i<width-2;i++)
	{
		model.verts[3*(i+2*width)+0] = -rad;
		model.verts[3*(i+2*width)+1] = i-rad+1;
		model.verts[3*(i+2*width)+2] = 0;
		model.verts[3*(i+3*width-2)+0] = rad;
		model.verts[3*(i+3*width-2)+1] = i-rad+1;
		model.verts[3*(i+3*width-2)+2] = 0;
	}
	model.verts[3*(width+(width-1)/2)+1] = 0;
	model.verts[3*(3*width-2+(width-1)/2-1)] = 0;

	model.edgel = 4*width;
	model.edges = new Uint16Array(model.edgel);
	for(i=0;i<width;i++)
	{
		model.edges[2*i+0] = i;
		model.edges[2*i+1] = i+width;
	}
	for(i=0;i<width-2;i++)
	{
		model.edges[2*(i+width)+0] = 2*width+i;
		model.edges[2*(i+width)+1] = 3*width-2+i;
	}
	model.edges[4*width-4] = 0;
	model.edges[4*width-3] = width-1;
	model.edges[4*width-2] = width;
	model.edges[4*width-1] = 2*width-1;

	model.trial = 0;
	model.trias = new Float32Array(0);


	model.xaxis = new Object();
	model.xaxis.vertl = 6;
	model.xaxis.verts = new Float32Array([0,0,0,1.2*rad,0,0]);
	model.xaxis.edgel = 2;
	model.xaxis.edges = new Uint16Array([0,1]);
	model.yaxis = new Object();
	model.yaxis.vertl = 6;
	model.yaxis.verts = new Float32Array([0,0,0,0,1.2*rad,0]);
	model.yaxis.edgel = 2;
	model.yaxis.edges = new Uint16Array([0,1]);
	model.zaxis = new Object();
	model.zaxis.vertl = 6;
	model.zaxis.verts = new Float32Array([0,0,0,0,0,1.2*rad-.5]);
	model.zaxis.edgel = 2;
	model.zaxis.edges = new Uint16Array([0,1]);

	return model;
}

function td_makemodel()
{
	model = new Object();

	// jumppoint
	model.vertl = 3*4;
	//model.verts = new Float32Array([1,0,0, 4,0,0, 1,2,0, 1,0,1]);
	model.verts = new Float32Array([0,0,0, 3,0,0, 0,2,0, 0,0,1]);

	model.edgel = 12;
	model.edges = new Uint16Array([0,1, 1,2, 2,0, 0,3, 3,2, 1,3]);

	model.trial = 12;
	model.trias = new Uint16Array([0,1,2, 0,3,2, 0,1,3, 1,2,3]);

	/*
	model.vertl = 12;
	model.verts = new Float32Array([-.433,-.75,0.01, .866,0,0.01, -.433,.75,0.01, 0,0,1.3]);

	model.edgel = 12;
	model.edges = new Uint16Array([0,1, 1,2, 2,0, 0,3, 3,2, 1,3]);

	model.trial = 12;
	model.trias = new Uint16Array([0,1,2, 0,3,2, 0,1,3, 1,2,3]);
	*/

	return model;
}

function td_setproj()
{
	// rotates view by theta and phi, then pulls camera back by dist and encloses origin in a frustrum that's ~2*rad wide

	var ct = Math.cos(tdv.theta);
	var st = Math.sin(tdv.theta);
	var cp = Math.cos(tdv.phi);
	var sp = Math.sin(tdv.phi);
	var dist = 5*tdv.projrad;
	var rad = tdv.projrad;
	var pm = new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]);

	pm[0] = ct;
	pm[1] = st*cp
	pm[2] = st*sp;
	pm[3] = 0;
	pm[4] = -st;
	pm[5] = ct*cp;
	pm[6] = ct*sp;
	pm[7] = 0;
	pm[8] = 0;
	pm[9] = -sp;
	pm[10] = cp;
	pm[11] = 0;
	pm[12] = 0;
	pm[13] = 0;
	pm[14] = -dist;
	pm[15] = 1;
	
	tw = (1-rad/dist)*rad*tdv.width/tdv.height;
	th = (1-rad/dist)*rad;
	tn = dist-rad;
	tf = dist+rad;
	tdv.projmat = new Float32Array([tn/tw,0,0,0, 0,tn/th,0,0, 0,0,(tf+tn)/(tn-tf),-1, 0,0,2*tf*tn/(tn-tf),0]);
	//tdv.projmatrix = new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]);
	tdv.projmat = td_matmult(tdv.projmat,pm);
}

function td_matmult(m1,m2)
{
	var m3 = new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]);
	var i,j;

	for(i=0;i<4;i++)
	{
		for(j=0;j<4;j++)
		{
			m3[i+j*4] = m1[i+0*4]*m2[0+j*4] + m1[i+1*4]*m2[1+j*4] + m1[i+2*4]*m2[2+j*4] + m1[i+3*4]*m2[3+j*4];
		}
	}
	return m3;
}

