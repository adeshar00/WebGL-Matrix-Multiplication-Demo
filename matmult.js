/*  4x4 Matrix Multiplication widget    Andrew Desharnais   Hurricane Electric

To implement:
Just include links to jQuery and to this .js file in your html, and add a div with id "container" to the body
Can also include transdisp.js, if a visual representation is desired, showing what a transformation does

To interact with implementation:
Modify the values of the matrix cells on the right hand side of the equation, and the solution matrix to the left will be populated with the product automatically
Click the "Add Matrix" button to add an identity matrix to the right of the product
Drag a matrix to the deletion box to delete it
Drag a matrix between two others to move it [note: currently just appends to matrix released upon matrix]
Solution string generated and returned by mmt_genSolString function
[For debugging] Add a div with id="output" for debugging shtuff

DOM Overview:
The scripts below will append all the necessary elements to element id "mmt", and create an internal style element to style them
Matrices are represented with ".matrix" class elements, which are divs containing 16 text input fields of class ".cell"
"#mmt" contains three divs with ids "#mmt_solution", "#mmt_product", and "#mmt_buttons"
"#mmt_product" contains a bunch of ".matrix" elements which can be dynamically generated, destroyed, and rearranged by the user
"#mmt_solution" is a ".matrix" div whose cells are automatically populated with product of all matrices in "#mmt_product"
"#mmt_buttons" contains the elements for manipulating ".matrix" divs (the "#mmt_add" button and "#mmt_remove" div)

Solution String:
Solution string contains 16 cell values of solution matrix
Values in string are in column-major order (transpose of how they're store in memory)
Values in string are seperated by whitespace
Each value is rounded off at the fifth decimal place

Cell input rules:
Can input decimal numbers, fractions, and sin/cos expressions
Expressions involving pi can be put inside cos/sin expressions, and can put minus sign in front of cos/sin
Can parse sqrt expressions (e.x. sqrt(4)/sqrt(5)))
CAN'T evaluate expressions on outside of cos/sin result other than minus sign (e.i. -cos(pi*2/3) will work, but -2*cos(pi/4) will get parsed wrong and return -cos(pi/4) ))
Unparsable input should return a 0 and not break the widget

TO DO:
implement options per problem set. examples: can use matrix templates, can use perspective matrix, has animation
assign "labels" which hang over matrices. e.x. translation T, rotation R, products a combo of what they are: TRSRT
maybe leave parens when doing trig functions, and eval so can accept inputs like  2*cos(0)
cookies to save/load matrix?
make webgl version of transdisp for fast anims
every now and then swap order in html of includes for mmatmult.js and transdisp.js, to catch any dependcy glitches
test matrix drag on multistory matrix products (like if there are a crapload of matrices and there are two rows)
reorganize functions, check documentation and make sure it doesn't suck
make so when altermatrix subwindow closed, updates cells (in case people click between cells without hitting "submit")

*/



// Global Vars
var mmt_dragstate = new Object();
var mmt_clock = new Object();
var charw;


// Init
$(document).ready(function()
{

	// Set Style for elements
	$("head").append("<style></style>");
	$("head style").append("#mmt{ }\n")
	$("head style").append(".mmt_matrix{ margin:5px; padding:10px; background-color:#ffffff; display:inline-block; vertical-align:top; border-style:solid; border-color:#d0d0d0; border-radius:10px; }\n")
	//$("head style").append(".mmt_cell{ width:3em; text-align:right;-webkit-user-select:text;-khtml-user-select:text;-moz-user-select: Normal; -o-user-select: text; user-select: text; }\n")
	$("head style").append(".mmt_cell{ display:inline-block; width:55px; height:30px; overflow:hidden; text-align:center; vertical-align:text-top; }\n")
	$("head style").append(".mmt_icell{ display:inline-block; margin:2px; width:4em; text-align:right; }\n")
	$("head style").append(".mmt_highlight{ background-color:#ff8000; }\n")
	$("head style").append(".mmt_nohighlight{ background-color:#ffe0d0; }\n")
	$("head style").append(".mmt_noselect{-webkit-touch-callout:none;-webkit-user-select:none;-khtml-user-select:none;-moz-user-select:none;-ms-user-select:none;user-select:none; }\n")
	//$("head style").append(".mmt_noselect{ }\n")

 	// Determine char width FLAG find a better way to do this...
	$("#mmt").prepend("<span>v</span>");
	charw = $("#mmt").find("span:first").width();
	$("#mmt").find("span:first").remove();

	// Insert "#mmt_solution" and "#mmt_product" divs into #mmt
	$("#mmt").css("background-color","#0000ff");
	$("#mmt").append("<div id=\"mmt_solution\" class=\"mmt_matrix\"></div>");
	$("#mmt").append("<div style=\"display:inline-block;height:4em;font-weight:bold;vertical-align:bottom;\">=</div>");
	$("#mmt").append("<div id=\"mmt_product\" style=\"background-color:#ffff00;display:inline-block;\"></div>");
	$("#mmt").append("<div id=\"mmt_buttons\" style=\"background-color:red;padding-left:200px;padding-top:10px;\"></div>");
	$("#mmt_buttons").append("<div id=\"mmt_remove\" class=\"mmt_nohighlight\"style=\"margin-right:2em;display:inline-block;font-size:80%;width:12em;height:6em;border-style:solid;border-width:2px;\">Drag matrices here to delete them</div>");
	$("#mmt_buttons").append("<button id=\"mmt_add\" type=\"button\">Add Matrix</button>");
	$("#mmt").addClass("mmt_noselect");
	$("#mmt_buttons").append("<div id=\"mmt_info\"style=\"display:inline-block;background-color:#ffffdd;margin-left:20px;border-style:solid;border-radius:7px;width:1em;height:1em;text-align:center;cursor:default;\"><b>?</b></div>");
	$("#mmt_info").attr("title","Click on a matrix on the right hand side of the equation to alter it's values. Click the \"Add Matrix\" button to add matrices to product.  Drag matrices and release in new position to rearrange. Drag matrices to deletion box to remove them.\nAcceptable values for matrix cells are integers, decimal values, fractions, cos or sin expressions, and square roots.\ncos and sin expressions are in radians, can include \"pi\" times some value, and can have a minus sign in front, but cannot be part of a fraction (e.x. \"cos(pi)\" or \"-sin(pi*2/3)\" are valid expressions, but \"2*sin(pi)\" and \"cos(pi)/2\" are not).\nTo express square roots, use sqrt(x).  Square roots can be expressed as fractions but cannot contain fractions(e.x. \"sqrt(29)/sqrt(38)\" is a valid expression, but \"sqrt(20/5)\" is not).\nInvalid inputs will return 0.");

	// Load problem into testdisplay div
	$("#testdisplay").append("<div id=\"content\"></div>");
	$("#testdisplay").append("<div id=\"display\"></div>");
	$("#content").hide();
	$("#testdisplay").append("<button id=\"psolbutton\">Show/Hide solution</button");
	$("#testdisplay").append("<div id=\"psolution\"></div>");
	$("#psolution").hide();
	$("#psolbutton").click(function(){$("#psolution").toggle();});
	/*
	$("#content").load("../math/viewer.php?p=./HE/generators/andrewd/Combined_Transformations_1.c&q="+(Math.floor(Math.random()*29)+1), function(){
		$("#display").append($("#content p").html());
		$("#psolution").append("<b>Solution:</b><br>"+$("#content p:eq(3)").html());
		var content = $('#display').html();
		var regex = /<!--\s*WDATA=(.*)\s*-->/;
		var matches = regex.exec(content)[1];
		var tmat = new Array();
		var i = 0;
		tmat[i] = parseInt("0x"+matches.substring(4*i,4*(i+1)))/4096-8;i++;
		tmat[i] = parseInt("0x"+matches.substring(4*i,4*(i+1)))/4096-8;i++;
		tmat[i] = parseInt("0x"+matches.substring(4*i,4*(i+1)))/4096-8;i++;
		tmat[i+1] = parseInt("0x"+matches.substring(4*i,4*(i+1)))/4096-8;i++;
		tmat[i+1] = parseInt("0x"+matches.substring(4*i,4*(i+1)))/4096-8;i++;
		tmat[i+1] = parseInt("0x"+matches.substring(4*i,4*(i+1)))/4096-8;i++;
		tmat[i+2] = parseInt("0x"+matches.substring(4*i,4*(i+1)))/4096-8;i++;
		tmat[i+2] = parseInt("0x"+matches.substring(4*i,4*(i+1)))/4096-8;i++;
		tmat[i+2] = parseInt("0x"+matches.substring(4*i,4*(i+1)))/4096-8;i++;
		tmat[i+3] = parseInt("0x"+matches.substring(4*i,4*(i+1)))/4096-8;i++;
		tmat[i+3] = parseInt("0x"+matches.substring(4*i,4*(i+1)))/4096-8;i++;
		tmat[i+3] = parseInt("0x"+matches.substring(4*i,4*(i+1)))/4096-8;i++;
		tmat[3] = tmat[7] = tmat[11] = 0;
		tmat[15] = 1;
		td_settar(tmat);
	});
	*/

	// Fill #mmt_solution
	mmt_fillmatrix("#mmt_solution");
	

	// Init drag code
	mmt_dragstate.isdragging = false;
	mmt_dragstate.isdown = false;
	mmt_dragstate.overid = -1;		// tracks which matrix to insert dragged matrix before: -1 means none
	mmt_dragstate.draggedid = 0;		// tracks which matrix is being dragged
	$(document).mouseup(function() // Note: The code here will trigger after the code tied to the mouseup events below, since events tied to children fire before events of the same type that are associated with parent
	{
		if(mmt_dragstate.isdown)
		{
			mmt_dragstate.isdown = false;
			mmt_dragstate.isdragging = false;
			$("#mmt_remove").removeClass("mmt_highlight");
			$("#mmt_remove").addClass("mmt_nohighlight");
		}
	});
	$(document).mousemove(function(e) // Constantly keep mx/my vars updated with current mouse coordinates
	{
		mmt_dragstate.mx = e.pageX;
		mmt_dragstate.my = e.pageY;
	});
	$("#mmt_product").mouseleave(function(e)
	{
		mmt_dragstate.overid=-1;
	});
	$("#mmt_product").mouseup(function(e)
	{
		// mouse rearrange code here, and delete subwindow FLAG
	});
	//$("#mmt_product").append("<div id=\"mmt_dragicon\" style=\"background-color:red;width:20px;height:20px;\"></div>");
	//$("#mmt_dragicon").hide();


	// Event handlers for "#mmt_remove" div
	$("#mmt_remove").mouseenter(function() // highlight box when dragged over with matrix div
	{
		if(mmt_dragstate.isdragging)
		{
			$("#mmt_remove").removeClass("mmt_nohighlight");
			$("#mmt_remove").addClass("mmt_highlight");
		}
	});
	$("#mmt_remove").mouseleave(function(){ $("#mmt_remove").removeClass("mmt_highlight"); }); // undo highlight
	$("#mmt_remove").mouseup(function() // deletes matrix div on drag into box
	{
		if(mmt_dragstate.isdragging)
		{
			$("#mmt_product").children().eq(mmt_dragstate.draggedid).remove();
			mmt_calculate();
		}
	});


	// Initialize Add Matrix button
	//$("#mmt_add").click(function(){ mmt_addmatrix(); });
	$("#mmt_add").click(function(){ mmt_subinteract(1); });

	// Init TransformationDisplay if used
	if(1) // FLAG check that transdisp is being used
	{
		td_init();
		
		// Init clock variables
		if(1) // FLAG check for option that enables/disables animation
		{
			mmt_clock.time = 0;				// Current phase of animation
			mmt_clock.period = 50;				// How many ms between clockticks
			mmt_clock.modulo = 1000/mmt_clock.period;	// How many clockticks before repeating animation
			mmt_clock.on = false;				// Determines if clock is "on" (if mmt_clocktick is running repeatedly)
			mmt_loop = false;				// Determines if animation is looped or not
			mmt_clock.lasttick = 0;				// Time when mmt_clocktick last executed
			mmt_clock.lag = 0;				// How many ms the current animation is from where it should be
			mmt_clock.lagbuffer = 3;			// Max size of lag, in periods
			$("#td_clockuis").click(function(){mmt_clockswitch()});
			$("#td_clockuir").click(function(){mmt_clockoff()});
			$("#td_clockuit").blur(function(){mmt_clock.time=0; mmt_clock.modulo=1000*$("#td_clockuit").val()/mmt_clock.period;});
			$("#td_clockuil").click(function(){mmt_clock.loop=$(this).prop("checked");});
		}
	}

	// Add first matrix (there must always be one)
	mmt_addmatrix();


	// Call to calculate, so solution is populated with identity
	mmt_calculate();

	// Uncomment for html of everything in container to be printed to #mmt_ouput
	//$("#output").text($("#mmt").html());

});

function mmt_subinteract(type) // Function which controls sub window (the little popup window with options when you click on "add matrix")
{
	$("#mmt_subwindow").remove();
	var subwindiv = "<div id=\"mmt_subwindow\" style=\"width:200px;height:200px;border-style:solid;border-radius:10px;background-color:red;position:absolute;top:"+($("#mmt_add").offset().top-100)+"px;left:"+($("#mmt_add").offset().left+120)+"px;\"></div>";

	switch(type)
	{
		// case 0 does nothing: used just to clear window
		case 1: // FLAG make uniform button width!!!!!!
			$("#mmt").append(subwindiv);
			$("#mmt_subwindow").append("What kind of matrix?<br>");	
			$("#mmt_subwindow").append("<button id=\"mmt_swbi\" style=\"width:120px;\">Identity</button><br>");	
			$("#mmt_subwindow").append("<button id=\"mmt_swbt\" style=\"width:120px;\">Translation</button><br>");	
			$("#mmt_subwindow").append("<button id=\"mmt_swbr\" style=\"width:120px;\">Rotation</button><br>");	
			$("#mmt_subwindow").append("<button id=\"mmt_swbs\" style=\"width:120px;\">Scale</button><br>");	
			$("#mmt_subwindow").append("<br>");	
			$("#mmt_subwindow").append("<button id=\"mmt_swbcan\">Cancel</button>");	
			$("#mmt_swbi").click(function(){mmt_addmatrix();mmt_subinteract(0);});
			$("#mmt_swbt").click(function(){mmt_subinteract(2);});
			$("#mmt_swbr").click(function(){mmt_subinteract(3);});
			$("#mmt_swbs").click(function(){mmt_subinteract(4);});
			$("#mmt_swbcan").click(function(){mmt_subinteract(0);});
			break;
		case 2:
			$("#mmt").append(subwindiv);
			$("#mmt_subwindow").append("X component:<br><input style=\"width:100px;\" type=\"text\" id=\"mmt_swbx\" value=\"0\"><br>");
			$("#mmt_subwindow").append("Y component:<br><input style=\"width:100px;\" type=\"text\" id=\"mmt_swby\" value=\"0\"><br>");
			$("#mmt_subwindow").append("Z component:<br><input style=\"width:100px;\" type=\"text\" id=\"mmt_swbz\" value=\"0\"><br>");
			$("#mmt_subwindow").append("<br>");
			$("#mmt_subwindow").append("<button id=\"mmt_swbok\">OK</button>");	
			$("#mmt_subwindow").append("<button id=\"mmt_swbcan\">Cancel</button>");	
			$("#mmt_swbok").click(function()
			{
				var newmat = mmt_addmatrix();
				newmat.find("#mmt_c03").html($("#mmt_swbx").val());
				newmat.find("#mmt_c13").html($("#mmt_swby").val());
				newmat.find("#mmt_c23").html($("#mmt_swbz").val());
				mmt_fittext(newmat);
				mmt_calculate();
				mmt_subinteract(0);
			});
			$("#mmt_swbcan").click(function(){mmt_subinteract(0);});
			break;
		case 3:
			$("#mmt").append(subwindiv);
			$("#mmt_subwindow").append("Axis of Rotation:<br>");
			$("#mmt_subwindow").append("<select id=\"mmt_swbl\"><option value=\"x\">X-axis</option><option value=\"y\">Y-axis</option><option value=\"z\">Z-axis</option></select><br>");
			$("#mmt_subwindow").append("Angle of Rotation:<br>");
			$("#mmt_subwindow").append("(In Radians)<br>");
			$("#mmt_subwindow").append("<input style=\"width:100px;\" type=\"text\" id=\"mmt_swba\" value=\"1/2*PI\"><br>");
			$("#mmt_subwindow").append("<br>");
			$("#mmt_subwindow").append("<button id=\"mmt_swbok\">OK</button>");	
			$("#mmt_subwindow").append("<button id=\"mmt_swbcan\">Cancel</button>");	
			$("#mmt_swbok").click(function()
			{
				var newmat = mmt_addmatrix();
				var t = $("#mmt_swba").val();
				switch($("#mmt_swbl").val())
				{
					case 'x':
					newmat.find("#mmt_c11").html(("cos("+t+")"));
					newmat.find("#mmt_c12").html(("-sin("+t+")"));
					newmat.find("#mmt_c21").html(("sin("+t+")"));
					newmat.find("#mmt_c22").html(("cos("+t+")"));
					break;
					case 'y':
					newmat.find("#mmt_c00").html(("cos("+t+")"));
					newmat.find("#mmt_c02").html(("sin("+t+")"));
					newmat.find("#mmt_c20").html(("-sin("+t+")"));
					newmat.find("#mmt_c22").html(("cos("+t+")"));
					break;
					case 'z':
					newmat.find("#mmt_c00").html(("cos("+t+")"));
					newmat.find("#mmt_c01").html(("-sin("+t+")"));
					newmat.find("#mmt_c10").html(("sin("+t+")"));
					newmat.find("#mmt_c11").html(("cos("+t+")"));
					break;
				}	
				mmt_fittext(newmat);
				mmt_calculate();
				mmt_subinteract(0);
			});
			$("#mmt_swbcan").click(function(){mmt_subinteract(0);});
			break;
		case 4:
			$("#mmt").append(subwindiv);
			$("#mmt_subwindow").append("X factor:<br><input style=\"width:100px;\" type=\"text\" id=\"mmt_swbx\" value=\"1\"><br>");
			$("#mmt_subwindow").append("Y factor:<br><input style=\"width:100px;\" type=\"text\" id=\"mmt_swby\" value=\"1\"><br>");
			$("#mmt_subwindow").append("Z factor:<br><input style=\"width:100px;\" type=\"text\" id=\"mmt_swbz\" value=\"1\"><br>");
			$("#mmt_subwindow").append("<br>");
			$("#mmt_subwindow").append("<button id=\"mmt_swbok\">OK</button>");	
			$("#mmt_subwindow").append("<button id=\"mmt_swbcan\">Cancel</button>");	
			$("#mmt_swbok").click(function()
			{
				var newmat = mmt_addmatrix();
				newmat.find("#mmt_c00").html($("#mmt_swbx").val());
				newmat.find("#mmt_c11").html($("#mmt_swby").val());
				newmat.find("#mmt_c22").html($("#mmt_swbz").val());
				mmt_fittext(newmat);
				mmt_calculate();
				mmt_subinteract(0);
			});
			$("#mmt_swbcan").click(function(){mmt_subinteract(0);});
			break;
	}
}

function mmt_altermatrix(mat)
{
	/* Generates subwindow which allows user to alter matrix cells
	   Fills windows with text inputs for each cell, along with "OK" and "Cancel" buttons
	   */

	// Generate Window
	mmt_subinteract(0);
	subwindiv = "<div id=\"mmt_subwindow\" style=\"border-style:solid;border-radius:10px;background-color:#0000ff;padding:10px;position:absolute;\"></div>";
	$("#mmt").append(subwindiv);
	var sub = $("#mmt_subwindow");
	for(i=0;i<4;i++)
	{
		for(j=0;j<4;j++)
		{
			sub.append("<input id='mmt_c"+i+j+"' class='mmt_icell' type='text' value='"+(mat.find("#mmt_c"+i+j).html())+"'/>");
		}
		sub.append("<br>");
	}
	sub.append("<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<button id=\"mmt_swbok\">Submit</button>");
	sub.append("&nbsp;&nbsp;&nbsp;&nbsp;<button id=\"mmt_swbcan\">Cancel</button>");

	// Define behavior for buttons
	$("#mmt_swbok").click(function()
	{
		for(i=0;i<4;i++)
		{
			for(j=0;j<4;j++)
			{
				mat.find("#mmt_c"+i+j).html(sub.find("#mmt_c"+i+j).val());
			}
		}
		mmt_fittext(mat);
		mmt_calculate();
		mmt_subinteract(0);
	});
	$("#mmt_swbcan").click(function(){mmt_subinteract(0);});


	twidth = mat.width();
	theight = mat.height();
	scalex = sub.width()/twidth;
	scaley = sub.height()/theight;
	tx = mat.offset().left;
	ty = mat.offset().top;
	sub.css({"left":(tx+(1-scalex)*twidth/2),"top":(ty+(1-scaley)*theight/2)});

}

function mmt_fittext(mat)
{
	var t;
	var cellw = mat.find("#mmt_c00").width();
	for(i=0;i<4;i++)
	{
		for(j=0;j<4;j++)
		{
			t = mat.find("#mmt_c"+i+j);
			textw = t.text().length*charw;
			if(textw>cellw)
			{
				textw = cellw/(textw); // new width in em
				t.css("font-size",textw+"em");
			}
		}
	}
}

function mmt_addmatrix() // Injects a new ".matrix" into "#mmt_product", and defines user interaction with it
{

	var id = $("#mmt_product").children().length;
	$("#mmt_product").append("<div class=\"mmt_matrix\"></div>");
	var amatrix = $("#mmt_product").children().eq(id);
	amatrix.mousedown(function()
	{
		mmt_dragstate.isdown = true;
		mmt_dragstate.draggedid= $(this).index();
	});
	amatrix.mouseout(function()
	{
		if(mmt_dragstate.isdown)
		{
			if(!mmt_dragstate.isdragging) mmt_dragstart();
		}
	});
	amatrix.mouseup(function()
	{
		if(mmt_dragstate.isdown)
		{
			var id = $(this).index();
			var did = mmt_dragstate.draggedid;
			if(did != id)
			{
				var mats = $(this).parent().children();
				if(mmt_dragstate.mx>$(this).offset().left+$(this).width()/2) mats.eq(did).insertAfter(mats.eq(id));
				else mats.eq(did).insertBefore(mats.eq(id));
				mmt_calculate();
			}
			else
			{
				if(!mmt_dragstate.isdragging) mmt_altermatrix($(this));
			}
		}
	});

	mmt_fillmatrix(amatrix);

	return amatrix;
}

function mmt_fillmatrix(amatrixdiv) // Injects 16 (4x4) ".cell" elements into the passed matrix div
{
	var i,j; // FLAG replace amtrixdiv string with jquery object
	$(amatrixdiv).append("<div id=\"mmt_leftb\" style=\"display:inline-block;border-style:solid;border-right-width:0px;width:7px;vertical-align:bottom;\"></div>");
	$(amatrixdiv).append("<div style=\"display:inline-block;\" id=\"mmt_values\"></div>");
	$(amatrixdiv).append("<div id=\"mmt_rightb\" style=\"display:inline-block;border-style:solid;border-left-width:0px;width:7px;vertical-align:bottom;\"></div>");
	matv = $(amatrixdiv).find("#mmt_values");
	for(i=0;i<4;i++)
	{
		for(j=0;j<4;j++)
		{
			matv.append("<div id='mmt_c"+i+j+"' class='mmt_cell' type='text'>"+(i==j?1:0)+"</div>");
		}
		matv.append("<br>");
	}
	theight = matv.height();
	$(amatrixdiv).find("#mmt_leftb").css("height",theight);
	$(amatrixdiv).find("#mmt_rightb").css("height",theight);

}

function mmt_dragstart()
{
	mmt_dragstate.isdragging = true;
	mmt_subinteract(0);
	subwindiv = "<div id=\"mmt_subwindow\" style=\"border-style:solid;border-radius:10px;background-color:#ffffff;padding:10px;position:absolute;\"></div>";
	$("#mmt").append(subwindiv);
	mmt_fillmatrix("#mmt_subwindow");
	matv = $("#mmt_subwindow");
	matd = $("#mmt_product").children().eq(mmt_dragstate.draggedid);
	for(i=0;i<4;i++)
	{
		for(j=0;j<4;j++)
		{
			matv.find("#mmt_c"+i+j).html(matd.find("#mmt_c"+i+j).html());
		}
	}
	mmt_fittext(matv);
	mmt_dragstate.offsetx = -10;//mmt_dragstate.mx - matd.offset().left; // dragged relative to position when draw began, but having moving div under mouse blocked mousedown events on other divs
	mmt_dragstate.offsety = -10;//mmt_dragstate.my - matd.offset().top;

	//$("#mmt_dragicon").show();FLAG

	mmt_dragcheck();

}

function mmt_dragcheck()
{
	if(mmt_dragstate.isdragging)
	{
		$("#mmt_subwindow").css("left",mmt_dragstate.mx-mmt_dragstate.offsetx);
		$("#mmt_subwindow").css("top",mmt_dragstate.my-mmt_dragstate.offsety);
		/*amatrix.mouseover(function() FLAG
		{
			if(mmt_dragstate.isdragging)
			{
				var temp;
				if(mmt_dragstate.mx < amatrix.offset().left+amatrix.width()/2) temp = id;
				else temp = id+1;
				if(temp != mmt_dragstate.overid)
				{
					mmt_dragstate.overid = temp;
					$("#mmt_subwindowtarget").remove();alert("ADSF");
					//$("#mmt_subwindow").append("<div id=\"mmt_subwindowtarget\" style=\"width:20px;height:"+amatrix.height()+";position:absolute;background-color:#ffff00;left:"+($("#mmt_product").children().eq(temp).offset().left-10)+"\"></div>");
					$("#mmt_subwindow").append("<div id=\"mmt_subwindowtarget\" style=\"width:20px;height:"+amatrix.height()+";position:absolute;background-color:#ffff00;left:"+($("#mmt_product").children().eq(temp).offset().left-10)+"px;\"></div>");
				}
			}
		});*/
	/*	prod = $("#mmt_product");
		tmx = mmt_dragstate.mx;//-prod.offset().left;
		tmy = mmt_dragstate.my;//-prod.offset().top;
		prod.each(function()
		{
			// The t values below should be the same for each cell, but I'm doing it this way in case I later decide to go with dynamic matrix sizes
			tt = $(this).offset().top-$(this).height()/2;
			tb = $(this).offset().top+$(this).height()*1.5;
			tl = $(this).offset().left-$(this).width()/2;
			tr = $(this).offset().left+$(this).width()*1.5;
			if(tmx>tl && tmx<tr && tmy>tt && tmy<tb) // If mouse is within area around div
			{
				if(tmx > $(this).offset().left+$(this).width()/2) mmt_dragstate.overid = $(this).index()+1;
				else mmt_dragstate.overid = $(this).index();
			} 
		}); // FLAG maybe use this.. or maybe just junk it
		$("#output").text(mmt_dragstate.overid);*/
		setTimeout(mmt_dragcheck,50);
	}
	else
	{
		mmt_subinteract(0);
		

		//$("#mmt_dragicon").hide();FLAG
		//$("#mmt_product").
	}
}

function mmt_calculate() // Multiplies all matrices in "#mmt_product" div and populates "#mmt_solution" with result
{
	var i,j,t,mod;		// temp floats
	var s;			// temp string
	var tv1,tv2;		// temp vars
	var rp = new Array();	// running product matrix
	var bm = new Array();	// buffer matrix
	var tm = new Array();	// temp matrix
	var pm = new Array();	// perspective matrix
	var calctime;		// timer to evaluate execution time of this routine

	// Set timer
	calctime = new Date().getTime();

	// Initialize running product matrix
	for(i=0;i<4;i++)
	{
		for(j=0;j<4;j++)
		{
			rp[i+j*4] = i==j?1:0;
		}
	}

	// Traverse matrices, starting from right, and multiply
	var len = $("#mmt_product").children().length;
	var m;
	var mat;
	for(m=len-1;m>=0;m--)
	{
		mat = $("#mmt_product").children().eq(m);

		// Parse cells in current ".matrix" and populate temp matrix with values
		for(i=0;i<4;i++)
		{
			for(j=0;j<4;j++)
			{
				// Put content of cell into temp string (s) and temp number (t)
				s = mat.find("#mmt_c"+i+j).html();
				t = Number(s);

				// Check if cell content is a valid number
				if(isNaN(t))
				{

					// If cell content not a number, check for cos, sin, sqrt, and fraction
					s = s.toLowerCase();	// so caps don't miss being parsed
					if(s.indexOf("cos")>-1) // check for cos
					{
						mod = 1;
						if(s.indexOf("-")>-1)
						{
							if(s.indexOf("-")<s.indexOf("cos"))
							{
								s = s.replace("-","");
								mod = -1;
							}
						}
						s = s.replace("cos","");
						s = s.replace("(","");
						s = s.replace(")","");
						s = s.replace("t",mmt_clock.time/mmt_clock.modulo);
						if((tv1=s.indexOf("pi"))>-1) // add * if number is directly in front of pi (e.x. cos(2pi)
						{
							tv2 = s.charAt(tv1-1);
							if(tv2>= '0' && tv2<='9')
							{
								s = s.replace("pi","*pi");
							}
							s = s.replace("pi","3.141592653589793 ");
						}
						try { s = eval(s); } // in case s isn't valid
						catch (e) { s = "0"; mod = 0; }	// zero out
						t = Number(s);
						t = mod*Math.cos(t);
					}
					else if(s.indexOf("sin")>-1) // check for sin
					{
						mod = 1;
						if(s.indexOf("-")>-1)
						{
							if(s.indexOf("-")<s.indexOf("sin"))
							{
								s = s.replace("-","");
								mod = -1;
							}
						}
						s = s.replace("sin","");
						s = s.replace("(","");
						s = s.replace(")","");
						s = s.replace("t",mmt_clock.time/mmt_clock.modulo);
						if((tv1=s.indexOf("pi"))>-1)
						{
							tv2 = s.charAt(tv1-1);
							if(tv2>= '0' && tv2<='9')
							{
								s = s.replace("pi","*pi");
							}
							s = s.replace("pi","3.141592653589793 ");
						}
						try { s = eval(s); } // in case s isn't valid
						catch (e) { s = "0"; mod = 0; }	// zero out
						t = Number(s);
						t = mod*Math.sin(t);
					}
					else if(s.indexOf("sqrt")>-1) // check for sqrt
					{
						var notdone = 1;
						var ss = "";
						while(notdone)
						{
							notdone = 0;
							if(s.indexOf("sqrt")>-1)
							{
								notdone = 1; // parse again, in case of multiple sqrt in expression
								tv1 = s.indexOf("(")+1;
								tv2 = s.indexOf(")");
								ss = s.substring(tv1,tv2);
								s = s.substring(0,tv1) + Math.sqrt(ss) + s.substring(tv2,s.length)
								s = s.replace("sqrt","");
								s = s.replace("(","");
								s = s.replace(")","");
							}
						}

						try { s = eval(s); }
						catch (e) { s = "0"; }
						t = Number(s);


					}
					else // parse time, and check for arithmetic expression (for fraction)
					{
						s = s.replace("t",mmt_clock.time/mmt_clock.modulo);
						tv1 = true;
						try { s = eval(s); }
						catch (e) { s="0"; tv1=false;}
						if(tv1) t = Number(s);
					}

					// Check to make sure value isn't some tiny value like 10^(-20)
					if(t<.000005&&t>-.000005)
						t = 0;

					// Check if valid now, after doing above checks
					if(isNaN(t))
					{
						mat.find("#mmt_c"+i+j).html(0);
						t = 0;
					}


				}
				else mat.find("#mmt_c"+i+j).html(t); // Clears any wacky formating (0's before number, empty cell, etc)

				// Set corresponding temp matrix cell to t
				tm[i+j*4] = t;

			}
		}

		// Multiply running product by temp matrix, saving results to buffer
		for(i=0;i<4;i++)
		{
			for(j=0;j<4;j++)
			{
				bm[i+j*4] = tm[i+0*4]*rp[0+j*4] + tm[i+1*4]*rp[1+j*4] + tm[i+2*4]*rp[2+j*4] + tm[i+3*4]*rp[3+j*4];
			}
		}
		

		// Copy result(buffer) to running product
		for(i=0;i<16;i++)
		{
			rp[i]=bm[i];
		}
	}

	// Set solution equal to product
	for(i=0;i<4;i++)
	{
		for(j=0;j<4;j++)
		{
			$("#mmt_solution").find("#mmt_c"+i+j).html(rp[i+j*4]);
		}
	}
	
	// TEMP perspective matrix FLAG put in check to disable buttons if using!!!!!
	for(i=0;i<4;i++)
	{
		for(j=0;j<4;j++)
		{
			pm[i+j*4] = i==j?1:0;
		}
	}

	// Send data to Transform Display (if present)
	//if(typeof td_update == 'function') td_update(rp);
	td_update(rp);
	//td_update(rp,pm);

	calctime = new Date().getTime() - calctime;
	//$("#output").text(calctime);
	$("#output").text(mmt_clock.lag);
}

function mmt_clockswitch()
{
	if(mmt_clock.on)
	{
		// Halt mmt_clocktick
		mmt_clock.on = false;
		$("#td_clockuis").html("Start");
	}
	else
	{
		// Resume mmt_clocktick
		mmt_clock.on = true;
		mmt_clock.time = 0;
		mmt_clock.lasttick = new Date().getTime() - mmt_clock.period;
		mmt_clock.lag = 0;
		mmt_clocktick();
		$("#td_clockuis").html("Stop");
	}
}

function mmt_clockoff()
{
	// Halt mmt_clocktick and set t = 0
	mmt_clock.on = false;
	mmt_clock.time = 0;
	mmt_calculate();
}

function mmt_clocktick()
{

	if(mmt_clock.on)
	{
		// Update mmt_clocktime, update matrices, and redraw
		mmt_clock.time++;
		if(mmt_clock.time >= mmt_clock.modulo) // when at end of animation
		{
			if(mmt_clock.loop)
			{
				mmt_clock.time -= mmt_clock.modulo;
			}
			else
			{
				// If not looping and end of animation reached, recalculate and redraw with t=1, then halt
				mmt_calculate();
				mmt_clockswitch();
				return;
			}
		}
		mmt_calculate();

		// Determine when next mmt_clocktick call should occur
		var delay;
		var currenttime = new Date().getTime();
		mmt_clock.lag+= currenttime - mmt_clock.lasttick - mmt_clock.period;
		mmt_clock.lasttick = currenttime;
		if(mmt_clock.lag > mmt_clock.period)
		{
			delay = 0;
			if(mmt_clock.lag > mmt_clock.lagbuffer*mmt_clock.period)
			{
				/*
				// Skip a frame: increment time without rendering and reduce lag by one cycle
				mmt_clock.time++;
				mmt_clock.time%= mmt_clock.modulo;
				mmt_clock.lag-=mmt_clock.period;	
				*/

				// Just chop off excessive lag (to avoid jumps... above block resulted in choppy animation)
				mmt_clock.lag = mmt_clock.lagbuffer*mmt_clock.period;
			}
		}
		else
		{
			delay = mmt_clock.period - mmt_clock.lag;
		}
		setTimeout(mmt_clocktick, delay);
	}

}


function mmt_genSolString() // Generates Solution String
{

	var os = "";	// output string
	var i,j,t;	// temp ints

	mmt_clock.time = 0;
	for(i=0;i<4;i++)
	{
		for(j=0;j<4;j++)
		{
			t = parseFloat($("#mmt_solution").find("#mmt_c"+i+j).html());
			if(isNaN(t)) t=0;
			t = t.toFixed(5);
			os += t;
			if(!(j==3&&i==3)) os += "_";
		}
		if(i<3) os += "#_";
	}

	return os;

}
