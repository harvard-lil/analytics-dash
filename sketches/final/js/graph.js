var lc = lc || {};

lc.graph = function() {
	var width = 1000,
        height = 550,
        gWidth = 800,
        gHeight = 490;

    var circleColor = "blue";

    // default scaling / axes
    var x_axis_type = "chronological_x";
    var y_axis_type = "call_number_sort_order_y";
	var radius_type = "shelfrank";

	var formatAsYear= d3.format("04d");

	var svg = d3.select("#graph").append("svg").attr("height",height).attr("width","100%");
    width = $("#graph").width(),
    gWidth = width - 150;

    yearEnd = 2013;
	var timescale = d3.scale.linear().domain([1850,yearEnd]).range([0,gWidth]);

	var xscale = d3.scale.linear().domain([1850,yearEnd]).range([0,gWidth]);

	var yscale = d3.scale.linear().domain([0,16000000]).range([gHeight, 0]);

    svg.append("clipPath").attr("id","graph-box")
    	.append("rect").attr("width",gWidth).attr("height",gHeight);

    svg.append("g").attr("id","graph-subjects").attr("transform","translate(120,40)").attr("clip-path","url(#graph-box)");

	var barCharts = svg.append("g").attr("class","barchart").attr("transform","translate(120,40)").attr("clip-path","url(#graph-box)");

    var circleGroup = svg.append("g").attr("class","circles").attr("transform","translate(120,40)").attr("clip-path","url(#graph-box)");

    var axes = svg.append("g").attr("class","axes");
    // creates the axes

	var xAxis = d3.svg.axis()
		.scale(xscale)
		.orient("bottom")
		.tickFormat(formatAsYear);

	var yAxis = d3.svg.axis()
		.scale(yscale)
		.orient("left")
		.tickFormat(formatAsYear);

    function appendAxes() {

    	axes.append("g")
    		.attr("class", "axis")
    		.attr("id","xAxis")
    		.attr("transform","translate(120," +(height-20) +")");

    	axes.append("g")
    		.attr("class", "axis")
    		.attr("id","yAxis")
    		.attr("transform","translate(120,40)");

        axes.append("text")
	        .attr("id","searchTerm")
	        .attr("class","axis_labels")
	        .attr("text-anchor","middle")
	        .attr("transform","translate("+width/2+",20)");

        // axes.append("text")
	       //  .attr("id","x_axis")
    	   //  .attr("class","axis_labels")
	       //  .text("Publication Date")
	       //  .attr("text-anchor","middle")
	       //  .attr("transform","translate("+width/2+","+(height-20)+")")

        axes.append("text")
  	        .attr("class","axis_labels")
	        .attr("id","y_axis")
	        .text("LCSH Subject Heading Sort Order")
	        .attr("text-anchor","middle")
	        .attr("transform","translate(20,"+(height/2)+") rotate(-90)")
    }
    //defines function that ads labels to the axes

    appendAxes();

    function updateAxes() {
		axes.select("#xAxis").call(xAxis);
		axes.select("#yAxis").call(yAxis);
	}

	var minYear, maxYear;

	self.dataPrep = function(data) {
		var min = d3.min(data,function(d){ return d.pub_date_numeric; });
		var max = d3.max(data,function(d){ return d.pub_date_numeric; });
		self.updateDateRange(min,max);

		var LCClow = d3.min(data,function(d){ if (d.loc_call_num_sort_order) return d.loc_call_num_sort_order[0]; });
		var LCChigh = d3.max(data,function(d){ if (d.loc_call_num_sort_order) return d.loc_call_num_sort_order[0]; });
		self.updateLCCRange(LCClow, LCChigh);
	};

	self.updateDateRange = function(min, max) {
		minYear = min, maxYear = max;
		timescale.domain([minYear,maxYear]);
		xscale.domain([minYear,maxYear]);
		updateAxes();
		updateCircles();
		// updateBars();
	};

	self.updateLCCRange = function(min, max) {
		yscale.domain([max,min]);
		updateAxes();
		updateCircles();
	}

	self.appendCircles = function(data) {

        var circles = circleGroup.selectAll("circle").data(data);
        //binds data to circles
        circles.enter().append("circle").attr("class","c");
        circles.exit().remove();

        //runs the showInfo on mouseover
        circles.on("mouseover",function(d){
        	if (svg.attr("class") == "frozen") return;
  			this.parentNode.appendChild(this);
            self.showInfo(d, true);
        }).on("click",function(d){
        	if (svg.attr("class") == "frozen") {
        		this.parentNode.appendChild(this);
            	self.showInfo(d, true);
        	}
        	svg.attr("class","frozen");
        });

        updateCircles();
    }
    function updateCircles() {
    	var circles = circleGroup.selectAll("circle");
    	circles.attr("fill",function(d){
	        if (d.call_num && lcObjectArray[d.call_num[0].substr(0,1)]){
	        	return lcObjectArray[d.call_num[0].substr(0,1)].color;
        	} else {
	         	return "black";
	        }
		})
		.transition()
		.delay(function(d,i){
			return i*5;
		})
		.duration(500)
		.attr("cx", calculateX)
		.attr("cy", calculateY)
		.attr("r", calculateRadius);
    }

    // use the API facet response to draw data
    // this means we have to turn the data into something d3 will like
    // and then use d3.area
    var areaScale;

    self.drawArea = function(facets) {
		var data = [];
    	var total = 0;
    	for (var i = 0; i < (maxYear - minYear); i++) {
    		var year = i + minYear;
    		var count = facets.pub_date_numeric[+year];
			total = total + (count || 0 );
			data[i] = {
    			year: year,
    			count: count || 0,
    			total:total
    		};
    	}

    	areaScale = d3.scale.linear().range([gHeight, 0])
		    .domain([0, d3.max(data, function(d) { return d.total; })]);

		var bars = barCharts.selectAll("rect").data(data);
		bars.enter().append("rect");
		bars.exit().remove();

		updateBars();

        bars.on("mouseover",function(d){
  			showCounts(d);
    	});
    };

    function updateBars() {
		barCharts.selectAll("rect")
			.transition()
			.ease("linear")
			.delay(function(d,i){
				return i*5;
			}).duration(100)
			.attr("x", function(d, i) {
	   			return timescale(d.year);
	   		}).attr("y", function(d) {
				return areaScale(d.total);
			}).attr("width", gWidth / (maxYear - minYear))
			.attr("height", function(d) {
				return (gHeight-areaScale(d.total));
			});
	}

    var bookCounts = d3.select("#bookCounts");

    function showCounts(data) {
     	bookCounts.select("#countsOfBooks span").text(" In " + data.year + ", " + data.count + " books meeting your criteria were published, for a grand total of  "+data.total+" books" );
    }


    d3.csv('lc_class_schema_extended_20120223_parsed.csv', function(csv) {
        schema.parseCSV(csv);

        // set initial data for the navigator
        // initially we go two levels deep
        lc.subjectsorter
        	.initialData(schema.data)
        	.on("click", function(d) {
        		console.log(d);
        	});
        // lc.subjectsorter.data(schema.data);
    });


    var info = d3.select("#info");

    self.showInfo = function(data, inBox) {
        info.select("#title").text(data.title);
        if (data.creator)
            info.select("#creator").html("<li class='c'>" + data.creator.join("</li><li>") + "</li>");

        if (data.call_num)
           info.select("#lc").text(data.call_num.join("or "));

        info.select("#pub_date_numeric").text(data.pub_date_numeric);

        if (data.pages_numeric)
        	info.select("#pages_numeric").text(data.pages_numeric);
        else
        	info.select("#pages_numeric").text("Format: "+data.format);

        if (data.language)
			info.select("#language").text(data.language);

		if (data.lcsh)
            info.select("#lcsh").html("<li class='c'>" + data.lcsh.join("</li><li>") + "</li>");

        // info.select("#shelfrank span").text(data.shelfrank);
        // info.select("#subject").text(data.loc_call_num_subject);
		// info.select("#publisher span").text(data.publisher);
		// info.select("#pub_location span").text(data.pub_location);
        // info.select("#fac_score span").text(data.score_checkouts_fac);
        // info.select("#grad_score span").text(data.score_checkouts_grad);
        // info.select("#undergrad_score span").text(data.score_checkouts_undergrad);
        // info.select("#reserve_score span").text(data.score_reserves);
        // info.select("#format span").text(data.format);
        // info.select("#letter span").text(function(d){
        // 	if (data.call_num) {
        // 		var firstHalf = data.call_num[0].substr(0,1);
	       //      var secondHalf = lcObjectArray[firstHalf].subject;
	       //      return firstHalf + " -- " + secondHalf;
        // 	}
        // });
        // info.select("#letter")
        // 	.style("border-bottom-color", function(d){
      		//     if (data.call_num){
        //    			return lcObjectArray[data.call_num[0].substr(0,1)].color;
        //     	}
  		    // });

  		if (inBox) {
  			info.select("#add-to-carrel").text("Add To Carrel").on("click",function(){
	            lc.carrel.sendToCarrel(data);
	        });
  		} else {
  			info.select("#add-to-carrel").text("Remove From Carrel").on("click",function(){
	            lc.carrel.removeFromCarrel(data);
	            info.select("#add-to-carrel").text("Add To Carrel").on("click",function(){
		            lc.carrel.sendToCarrel(data);
		        });
	        });
  		}
    };

    $("#stack-circles").click(function(){
    	stackCircles();
    });

    function stackCircles() {
    	var circles = circleGroup.selectAll("circle");
    	var yearObj = {};
    	circles.attr("r",3).each(function(d){
    		if (d.pub_date_numeric in yearObj) {
    			yearObj[d.pub_date_numeric]++;
    		} else {
    			yearObj[d.pub_date_numeric] = 0;
    		}
    		d3.select(this).attr("cy",gHeight-5-(yearObj[d.pub_date_numeric]*7));
    	});
    }

    /*

		Axes toggle and Scale toggle buttons

    */
    // $(".x_toggle span").click(x_axis_button);
    $(".y_toggle li").click(y_axis_button);
    $(".scale_toggle li").click(radius_button);


	// Searching by results
	$("#creator li").live("click",function(){
		lc.search.runSearch("creator",$(this).text());
	});
	$("#lcsh li").live("click",function(){
		lc.search.runSearch("lcsh",$(this).text());
	});
	$("#subject").live("click",function(){
		lc.search.runSearch("subject",$(this).text());
	});


	// function x_axis_button(e){
	// 	x_axis_type = e.target.id;

	// 	$(".x_toggle span").removeClass("selected");
	// 	$(this).addClass("selected");

	// 	set_x_axis();
	// 	axes.select("#x_axis").text(x_axis_type);
	// }

	function y_axis_button(e){
		y_axis_type = e.target.id;

		$(".y_toggle li").removeClass("selected");
		$(this).addClass("selected");

		set_y_axis();
		axes.select("#y_axis").text(y_axis_type);
	}

	function radius_button(e){
		radius_type = e.target.id;

		$(".scale_toggle li").removeClass("selected");
		$(this).addClass("selected");

		set_radius();
	}

	// function set_x_axis(){
	// 	var circles = circleGroup.selectAll("circle");
	// 	circles
	// 		.transition()
	// 		// .ease("linear")
	// 		.delay(function(d,i){
	// 			return i*5;
	// 		})
	// 		.duration(500)
	// 		.attr("cx", calculateX);
	// 	updateAxes();
	// }

	function calculateX(d) {
		// switch(x_axis_type) {
		// 	case 'chronological_x':
				xscale.domain([minYear,maxYear]);
    			if (d.pub_date_numeric){
						return (xscale(d.pub_date_numeric));
				}
				else {
					return xscale(0);
				}
		// 		break;
		// 	case 'call_number_sort_order_x':
		// 		xscale.domain([0,16000000]);
		// 		if (d.loc_call_num_sort_order){
		// 	        return xscale(d.loc_call_num_sort_order[0]);
		// 		}
		// 		else {
		// 			return xscale(0);
		// 		}
		// 		break;
		// }
	}

	function set_y_axis(){
		var circles = circleGroup.selectAll("circle");
		circles
		.transition()
		// .ease("linear")
		.delay(function(d,i){
			return i*5;
		})
		.duration(500)
		.attr("cy", calculateY);
		updateAxes();
	}

	function calculateY(d) {
		switch(y_axis_type) {
			case 'grads':
				yscale.domain([0,300]);
    			if (d.score_checkouts_grad){
    				return  yscale(d.score_checkouts_grad);
				}
				else{
					return yscale(0);
				}
				break;
			case 'undergrads':
				yscale.domain([0,300]);
				if (d.score_checkouts_undergrad){
  					return  yscale(d.score_checkouts_undergrad);
				}
				else {
					return yscale(0);
				}
				break;
			case 'faculty':
				yscale.domain([0,300]);
				if (d.score_checkouts_fac){
  					return  yscale(d.score_checkouts_fac);
				}
				else{
					return yscale(0);
				}
				break;
			case 'popularity_y':
				yscale.domain([0,100]);
				if (d.shelfrank){
		            return yscale(d.shelfrank);
				}
				else {
					return 0;
				}
				break;
			// case 'date_y':
			// 	yscale.domain([minYear,maxYear]);
			// 	if (d.pub_date_numeric){
	  //               return yscale(d.pub_date_numeric);
			// 	}
			// 	else {
			// 		return yscale(0);
			// 	}
			// 	break;
			case 'call_number_sort_order_y':
				// yscale.domain([0,16000000]);
				if (d.loc_call_num_sort_order){
		            return (yscale(d.loc_call_num_sort_order[0]));
				}
				else {
					return yscale(0);
				}
				break;
		}
	}

	function set_radius(){
		var circles = circleGroup.selectAll("circle");
			circles
				.transition()
				.duration(500)
				.attr("r", calculateRadius);
	}

	function calculateRadius(d) {
		switch(radius_type) {
			case 'pages':
    			if (d.pages_numeric){
				 return (d.pages_numeric / 50);
				}
				else{
				return 6;
				}
				break;
			case 'shelfrank':
				if (d.shelfrank){
				return (d.shelfrank / 5);
				}
				else{
				return 6;
				}
				break;
			case 'same':
				if (d.shelfrank){
				return 4;
				}
				else{
				return 7;
				}
				break;
		}
	}
    return self;
}();