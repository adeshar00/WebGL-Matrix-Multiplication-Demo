/* Transformation Display

To use:
Add a div with id="transformationdisplay" to the DOM
Then call function "td_update" with a 16 value array (representing a 4x4 matrix) to render transforms

TO DO:
fix spacing of animation ui div
Maybe a way for user to enable/disable perspective matrix?  if disabled, use rot/zoom buttons
add zoom buttons
animated preset matrices? some sort of option which sets default values in matrix templates to include t?
put in perspective near/far checks in draw routines (should be between -1 and 1)

*/

var td_windowWidth=400;
var td_windowHeight=200;
var td_theta = -Math.PI/4;
var td_phi = -Math.PI*5/16;
var td_initialized = 0;
var td_modelmatrix = new Array();
var td_m = new Object(); // holds data for current model

function td_init()
{
	td_initialized = 1;
	$("#transformationdisplay").append("<canvas id=\"td_canvas\"></canvas>");
	$("#transformationdisplay").append("<br>Click to rotate ");
	$("#transformationdisplay").append("<button id=\"td_turnl\">&lt;-</button>");
	$("#transformationdisplay").append("<div style=\"display:inline-block\"><div><button id=\"td_turnu\">^</button></div><div><button id=\"td_turnd\">v</button></div></div>");
	$("#transformationdisplay").append("<button id=\"td_turnr\">-&gt;</button>");
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

	$("#td_turnl").click(function(){td_theta+=Math.PI/8;td_update()});
	$("#td_turnr").click(function(){td_theta-=Math.PI/8;td_update()});
	$("#td_turnu").click(function(){td_phi+=Math.PI/16;if(td_phi>Math.PI/2)td_phi=Math.PI/2;td_update()});
	$("#td_turnd").click(function(){td_phi-=Math.PI/16;if(td_phi<-Math.PI/2)td_phi=-Math.PI/2;td_update()});

	var cj = $("#td_canvas");
	cj.attr("width",td_windowWidth);
	cj.attr("height",td_windowHeight);
	cj.css("border","1px solid #000000");
	mmt_calculate();
}

function td_update(am,pm)
{

	// Initialize if it hasn't been done already FLAG maybe this isn't necessary... just have init called in mmt before any td_update calls... since td relies on mmt anyway
	if(!td_initialized) td_init();

	// am : "argument matrix"; 16 length number array
	var i,j,t;
	var bx,by,bz;
	var e0,e1;
	var c = document.getElementById("td_canvas");
	var ctx = c.getContext("2d");

	var vertices;
	var vertx = new Array(0, 1, 0, 0);
	var verty = new Array(0, 0, 1, 0);
	var vertz = new Array(0, 0, 0, 1);
	var vertc = new Array(0x800080, 0xff0000, 0x00ff00,0x0000ff);
	vertices = vertx.length;

	var tvx = new Array(); // holds transformed vertices
	var tvy = new Array();
	var tvz = new Array();
	var tvw;

	var edges;
	var edgev0 = new Array(0,0,0);
	var edgev1 = new Array(1,2,3);
	var edgec = new Array(0xff0000,0xff00,0xff);
	edges = edgev0.length;

	td_loadmodel(1);

	if(td_m.verts)
	{
		var temp = td_m.verts;
		vertices = temp.length/3;
		for(i=0;i<vertices;i++)
		{
			vertx[i] = temp[0+3*i];
			verty[i] = temp[1+3*i];
			vertz[i] = temp[2+3*i];
			vertc[i] = td_m.vcols[i];
		}
		temp = td_m.edges;
		edges = temp.length/2;
		for(i=0;i<edges;i++)
		{
			edgev0[i] = temp[0+2*i];
			edgev1[i] = temp[1+2*i];
			edgec[i]  = td_m.ecols[i];
		}
	}

	// Check if modelmatrix passed: save to memory if so, populate from memory if not
	if(!am)
	{
		am = new Array();
		for(i=0;i<16;i++)
		{
			am[i] = td_modelmatrix[i];
		}
	}
	else
	{
		for(i=0;i<16;i++)
		{
			td_modelmatrix[i] = am[i];
		}
	}

	// Check if perspective matrix passed, and generate if not
	if(!pm)
	{
		
		//*

		var ct = Math.cos(td_theta);
		var st = Math.sin(td_theta);
		var cp = Math.cos(td_phi);
		var sp = Math.sin(td_phi);
		var dist = 15;

		var pm = new Array();

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
		pm[12] = 0;//oy*st - ox*ct;//ox*ct - oy*st;
		pm[13] = 0;//cp*t + oz*sp;
		pm[14] = -dist;//sp*t - oz*cp;
		pm[15] = 1;

		tw = .1;
		th = .1;
		tn = .2*dist;
		tf = 1.8*dist;
		pm = td_matmult(new Array(tn/tw,0,0,0, 0,tn/th,0,0, 0,0,1,-tn, 0,0,0,0),pm); // FLAG properly finish, in case eventually using z for depth buffer

	}

	/*
	// Stretch transform to fit window
	// Below loop: radial z scale by window height
	t = td_windowHeight/2 / 7; // Scale factor
	t*=1.7; // FLAG delete me, just temp to adjust size of .5 width grid
	for(i=0;i<4;i++)
	{
		pm[4*i] *= t;
		pm[4*i+1] *= -t;
	}
	// Translate by (h+w)/(2h), h/2
	pm[12] += td_windowWidth/2;
	pm[13] += td_windowHeight/2;
	*/

	t = td_windowHeight/2 / 7; // Scale factor
	t*=1.7; // FLAG delete me, just temp to adjust size of .5 width grid
	pm = td_matmult(new Array(t,0,0,0, 0,-t,0,0, 0,0,1,0, td_windowWidth/2,td_windowHeight/2,0,1),pm);
	am = td_matmult(pm,am);
	for(i=0;i<vertices;i++)
	{
		bx = vertx[i];
		by = verty[i];
		bz = vertz[i];

		tvx[i] = bx*am[0] + by*am[4] + bz*am[8] + am[12];
		tvy[i] = bx*am[1] + by*am[5] + bz*am[9] + am[13];
		tvz[i] = bx*am[2] + by*am[6] + bz*am[10] + am[14];
		tvw    = bx*am[3] + by*am[7] + bz*am[11] + am[15];
		tvx[i]/= tvw;
		tvy[i]/= tvw;
		tvz[i]/= tvw;
		
		//tvx[i]*= t;
		//tvy[i]*= -t;
		//tvx[i]+= td_windowWidth/2;
		//tvy[i]+= td_windowHeight/2
	}


	/*
	// Multiply vertices by transformation matrix (without camera or perspective transforms)
	for(i=0;i<vertices;i++)
	{
		bx = vertx[i];
		by = verty[i];
		bz = vertz[i];

		tvx[i] = bx*am[0] + by*am[4] + bz*am[8] + am[12];
		tvy[i] = bx*am[1] + by*am[5] + bz*am[9] + am[13];
		tvz[i] = bx*am[2] + by*am[6] + bz*am[10] + am[14];

	}

	// Multiply vertices by camera and perspective matrices
	for(i=0;i<vertices;i++)
	{
		bx = tvx[i];
		by = tvy[i];
		bz = tvz[i];

		tvx[i] = bx*pm[0] + by*pm[4] + bz*pm[8] + pm[12];
		tvy[i] = bx*pm[1] + by*pm[5] + bz*pm[9] + pm[13];
		tvz[i] = bx*pm[2] + by*pm[6] + bz*pm[10] + pm[14];
		tvw    = bx*pm[3] + by*pm[7] + bz*pm[11] + pm[15];
		tvx[i]/= tvw;
		tvy[i]/= tvw;
		tvz[i]/= tvw;

	}
*/

	// Clear canvas
	ctx.clearRect(0, 0, c.width, c.height);

	// Determine order in which to render grid and model
	var order;
	if(am[14]>0) order = 1;// If model's center is below grid
	else order = 0;	
	
	while(order<4)
	{
		switch(order)
		{
			case 0: case 3:
			// Render grid
			t = 5; // number of gridlines to draw
			ctx.strokeStyle = "rgb(150,150,150)";
			for(i=-t;i<=t;i++)
			{
				
				ctx.beginPath();
				tvw = -t*pm[3] + i*pm[7] + 0*pm[11] + pm[15];
				ctx.moveTo((-t*pm[0]+i*pm[4]+pm[12])/tvw,(-t*pm[1]+i*pm[5]+pm[13])/tvw);
				tvw = t*pm[3] + i*pm[7] + 0*pm[11] + pm[15];
				ctx.lineTo((t*pm[0]+i*pm[4]+pm[12])/tvw,(t*pm[1]+i*pm[5]+pm[13])/tvw);
				ctx.stroke();
				ctx.beginPath();
				tvw = i*pm[3] - t*pm[7] + 0*pm[11] + pm[15];
				ctx.moveTo((i*pm[0]-t*pm[4]+pm[12])/tvw,(i*pm[1]-t*pm[5]+pm[13])/tvw);
				tvw = i*pm[3] + t*pm[7] + 0*pm[11] + pm[15];
				ctx.lineTo((i*pm[0]+t*pm[4]+pm[12])/tvw,(i*pm[1]+t*pm[5]+pm[13])/tvw);
				//ctx.moveTo(i*pm[0]-t*pm[4]+pm[12],i*pm[1]-t*pm[5]+pm[13]);
				//ctx.lineTo(i*pm[0]+t*pm[4]+pm[12],i*pm[1]+t*pm[5]+pm[13]);
				ctx.stroke();
			}
			ctx.strokeStyle = "rgb(0,0,0)";
			i=0;
			ctx.beginPath();
			ctx.moveTo(-t*pm[0]+i*pm[4]+pm[12],-t*pm[1]+i*pm[5]+pm[13]);
			ctx.lineTo(t*pm[0]+i*pm[4]+pm[12],t*pm[1]+i*pm[5]+pm[13]);
			ctx.stroke();
			ctx.beginPath();
			ctx.moveTo(i*pm[0]-t*pm[4]+pm[12],i*pm[1]-t*pm[5]+pm[13]);
			ctx.lineTo(i*pm[0]+t*pm[4]+pm[12],i*pm[1]+t*pm[5]+pm[13]);
			ctx.stroke();
			break;

			case 1: case 2:
			// Render Vertices
			for(i=0;i<vertices;i++)
			{
				// maybe assign to "object"/hash with z values as key, and draw in reverse order for proper overlap
				t = vertc[i];
				ctx.fillStyle = "rgb("+((t&0xff0000)>>16)+","+((t&0xff00)>>8)+","+(t&0xff)+")";
				ctx.fillRect(tvx[i]-2,tvy[i]-2,4,4);
			}

			// Render Edges
			for(i=0;i<edges;i++)
			{
				e0 = edgev0[i];
				e1 = edgev1[i];
				t = edgec[i];
				ctx.strokeStyle = "rgb("+((t&0xff0000)>>16)+","+((t&0xff00)>>8)+","+(t&0xff)+")";
				ctx.beginPath();
				ctx.moveTo(tvx[e0],tvy[e0])
				ctx.lineTo(tvx[e1],tvy[e1])
				ctx.stroke();
			}
			break;
		}
		order+=2;
	}

}

function td_matmult(m1,m2)
{
	var m3 = new Array();
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

function td_loadmodel(model)
{
	switch(model)
	{
		case 0:
			break;
		case 1:
			td_m.verts = new Array(1,1,1, -1,1,1, -1,-1,1, 1,-1,1, 1,1,-1, -1,1,-1, -1,-1,-1, 1,-1,-1);
			td_m.edges = new Array(0,1, 1,2, 2,3, 3,0, 4,5, 5,6, 6,7, 7,4, 0,4, 1,5, 2,6, 3,7)
			td_m.vcols = new Array(0x0000FF, 0xFF0000, 0xFF0000, 0xFF0000, 0xFF0000, 0xFF0000, 0xFF0000, 0xFF0000);
			td_m.ecols = new Array(0x0000FF, 0xFF0000, 0xFF0000, 0xFF0000, 0xFF0000, 0xFF0000, 0xFF0000, 0xFF0000, 0xFF0000, 0xFF0000, 0xFF0000, 0xFF0000);
			break;

		case 2:
			break;
	}
}
