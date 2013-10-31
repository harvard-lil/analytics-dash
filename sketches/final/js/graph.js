var lc = lc || {};

lc.graph = function() {
	var width = 1000,
        height = 550,
        gWidth = 800,
        gHeight = 490,
        bookData,
        currentBook;

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

    // var labelGroup = svg.append("g").attr("class","labels").attr("transform","translate(120,40)");

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

        // axes.append("text")
	       //  .attr("id","x_axis")
    	   //  .attr("class","axis_labels")
	       //  .text("Publication Date")
	       //  .attr("text-anchor","middle")
	       //  .attr("transform","translate("+width/2+","+(height-20)+")")

        axes.append("text")
  	        .attr("class","axis_labels")
	        .attr("id","y_axis")
	        .text("Subject")
	        .attr("text-anchor","middle")
	        .attr("transform","translate(20,"+(height/2)+") rotate(-90)")
    }
    //defines function that ads labels to the axes

    appendAxes();

    function updateAxes() {
		axes.select("#xAxis").call(xAxis);
		axes.select("#yAxis").call(yAxis);

		if (y_axis_type == 'call_number_sort_order_y') {
			$("#yAxis").hide();
			lc.subjectgraph.show();
		} else {
			$("#yAxis").show();
			lc.subjectgraph.hide();
		}
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
		minYear = min - .5, maxYear = max + .5;
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

		bookData = data;

        var circles = circleGroup.selectAll("circle").data(data);
        //binds data to circles
        circles.enter().append("circle").attr("class","c");
        circles.exit().remove();

        //runs the showInfo on mouseover
        circles.on("mouseover",function(d){
            lc.tooltip.show(d);

        	if (svg.attr("class") == "frozen") return;
  			this.parentNode.appendChild(this);
            self.showInfo(d, true);
        }).on("mouseout", function(d) {
        	lc.tooltip.hide();
        }).on("click",function(d){
        	if (svg.attr("class") == "frozen") {
        		this.parentNode.appendChild(this);
            	self.showInfo(d, true);
        	}
        	svg.attr("class","frozen");
        });

        updateCircles();
        // self.updateLabels(0);
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

  //   self.updateLabels = function(level) {
  //   	var titles = [];
		// circleGroup.selectAll("circle").each(function(d){
		// 	// console.log(d.loc_call_num_subject)
		// 	if (d.loc_call_num_subject) {
		// 		var title = d.loc_call_num_subject.split("--")[level];
		// 		var foundYet = false;
		// 		titles.forEach(function(t){
		// 			if (t.title == title) foundYet = true;
		// 		})
		// 		if (!foundYet) {
		// 			var titleObj = {"title":title,"y":calculateY(d)};	
		// 			titles.push(titleObj);
		// 		}					
		// 	} 
		// })
		// var ts = labelGroup.selectAll(".label").data(titles);
		// ts.enter().append("text").attr("x",0).attr("class","label");
		// ts.exit().remove();
		// ts.text(function(d){ return d.title; }).attr("y",function(d){ return d.y; });
  //   };

    // use the API facet response to draw data
    // this means we have to turn the data into something d3 will like
    // and then use d3.area
 //    var areaScale;

 //    self.drawArea = function(facets) {
	// 	var data = [];
 //    	var total = 0;
 //    	for (var i = 0; i < (maxYear - minYear); i++) {
 //    		var year = i + minYear;
 //    		var count = facets.pub_date_numeric[+year];
	// 		total = total + (count || 0 );
	// 		data[i] = {
 //    			year: year,
 //    			count: count || 0,
 //    			total:total
 //    		};
 //    	}

 //    	areaScale = d3.scale.linear().range([gHeight, 0])
	// 	    .domain([0, d3.max(data, function(d) { return d.total; })]);

	// 	var bars = barCharts.selectAll("rect").data(data);
	// 	bars.enter().append("rect");
	// 	bars.exit().remove();

	// 	updateBars();

 //        bars.on("mouseover",function(d){
 //  			showCounts(d);
 //    	});
 //    };

 //    function updateBars() {
	// 	barCharts.selectAll("rect")
	// 		.transition()
	// 		.ease("linear")
	// 		.delay(function(d,i){
	// 			return i*5;
	// 		}).duration(100)
	// 		.attr("x", function(d, i) {
	//    			return timescale(d.year);
	//    		}).attr("y", function(d) {
	// 			return areaScale(d.total);
	// 		}).attr("width", gWidth / (maxYear - minYear))
	// 		.attr("height", function(d) {
	// 			return (gHeight-areaScale(d.total));
	// 		});
	// }

    /*
    // superceded by subjectgraph.js?
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
    */


    var info = d3.select("#info"),
    	labels = $("#info .infoLabel"),
    	sortHeading = $(".sort-heading"),
    	addToCarrel = d3.select("#add-to-carrel");

    info.selectAll(".infoLabel").on("click",function(){
    	labels.removeClass("clicked");
    	$(this).addClass("clicked");
    	sortHeading.find(".sorter").text($(this).parent().attr("name"));
    });

    $(".book-sort").click(function(){
    	if (!$(".infoLabel.clicked").length) return;
    	var sortBy = $(".infoLabel.clicked").parent().attr("class"),
    		dir = $(this).hasClass("next");
    	sortBooks(sortBy, dir);
    })

    function sortBooks(sortBy, dir) {
    	bookData.sort(function(a,b){
  			if (a[sortBy] < b[sortBy])
  				return -1;
  			if ((a[sortBy] > b[sortBy]))
  				return 1;
  			return 0;
    	});
    	showInfo(bookData[bookData.indexOf(currentBook) + (dir ? 1 : -1)]);
    }

    self.showInfo = function(data, inBox) {
    	currentBook = data;

        info.select(".title .field").text(data.title);
        if (data.creator) {
            info.select(".creator .field").html("<li>" + data.creator.join("</li><li>") + "</li>");
            info.selectAll(".creator li").on("click",function(){
            	var creator = $(this).text();
            	$("#search-creator").val(creator);
            });
        }

        if (data.call_num && lcObjectArray[data.call_num[0].substr(0,1)]) {
        	var c = lcObjectArray[data.call_num[0].substr(0,1)].color
        	$("#info").css("border-left-color",c);
        } else {
        	$("#info").css("border-left-color","#808080");
        }

        if (data.call_num)
           info.select(".lc .field").html(data.call_num.join("or "));

        info.select(".pub_date_numeric .field").text(data.pub_date_numeric);

        info.select(".pages_numeric .field").text(data.pages_numeric ? data.pages_numeric : "Format: "+data.format);

        if (data.language)
			info.select(".language .field").text(data.language);

		if (data.lcsh) {
            info.select(".lcsh .field").html("<li class='c'>" + data.lcsh.join("</li><li>") + "</li>");
            info.selectAll(".lcsh li").on("click",function(){
            	var lcsh = $(this).text();
            	$("#search-lcsh").val(lcsh);
            });
		}

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
  			addToCarrel.text("Add This Item To The Carrel").on("click",function(){
	            lc.carrel.sendToCarrel(data);
	        });
  		} else {
  			addToCarrel.text("Remove This Item From The Carrel").on("click",function(){
	            lc.carrel.removeFromCarrel(data);
	            info.select("#add-to-carrel").text("Add This Item To The Carrel").on("click",function(){
		            lc.carrel.sendToCarrel(data);
		        });
	        });
  		}
    };

    // $("#stack-circles").click(function(){
    // 	stackCircles();
    // });

    // function stackCircles() {
    // 	var circles = circleGroup.selectAll("circle");
    // 	var yearObj = {};
    // 	circles.attr("r",3).each(function(d){
    // 		if (d.pub_date_numeric in yearObj) {
    // 			yearObj[d.pub_date_numeric]++;
    // 		} else {
    // 			yearObj[d.pub_date_numeric] = 0;
    // 		}
    // 		d3.select(this).attr("cy",gHeight-5-(yearObj[d.pub_date_numeric]*7));
    // 	});
    // }

    /*

		Axes toggle and Scale toggle buttons

    */
    // $(".x_toggle span").click(x_axis_button);
    $(".y_toggle li").click(y_axis_button);
    $(".scale_toggle li").click(radius_button);


	// Searching by results
	$("#creator li").live("click",function(){
		lc.search.runSearch({
			"creator": $(this).text()
		});
	});
	$("#lcsh li").live("click",function(){
		lc.search.runSearch({
			"lcsh_keyword": $(this).text()
		});
	});


	// function x_axis_button(e){
	// 	x_axis_type = e.target.id;

	// 	$(".x_toggle span").removeClass("selected");
	// 	$(this).addClass("selected");

	// 	set_x_axis();
	// 	axes.select("#x_axis").text(x_axis_type);
	// }

	function y_axis_button(e){
		y_axis_type = $(e.target).attr("name");

		$(".y_toggle li").removeClass("selected");
		$(this).addClass("selected");

		set_y_axis();
		axes.select("#y_axis").text(y_axis_type);
	}

	function radius_button(e){
		radius_type = $(e.target).attr("name");

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
		xscale.domain([minYear,maxYear]);
		return xscale(d.pub_date_numeric || 0);
	}

	lc.subjectgraph.on("selected", function() {
		if (y_axis_type == 'call_number_sort_order_y')
			set_y_axis();
	});

	function set_y_axis(){
		var circles = circleGroup.selectAll("circle");
		circles
		.transition()
		// .ease("linear")
		.duration(500)
		.delay(function(d,i){
			return i*2;
		})
		.attr("cy", calculateY);
		updateAxes();
	}

	function calculateY(d) {
		switch(y_axis_type) {
			case 'grads':
				yscale.domain([0,300]);
				return  yscale(d.score_checkouts_grad || 0);
			case 'undergrads':
				yscale.domain([0,300]);
				return  yscale(d.score_checkouts_undergrad || 0);
			case 'faculty':
				yscale.domain([0,300]);
				return  yscale(d.score_checkouts_fac || 0);
			case 'popularity_y':
				yscale.domain([0,100]);
	            return yscale(d.shelfrank || 0);
			case 'call_number_sort_order_y':
				if (d.loc_call_num_sort_order){
		            // return (yscale(d.loc_call_num_sort_order[0]));
		            return lc.subjectgraph.calculateY(d.loc_call_num_sort_order[0]);
				}
				else {
					return yscale(0);
				}
				break;
		}
	}

	function set_radius(){
		var circles = circleGroup.selectAll("circle");
			circles.transition()
				.duration(500)
				.attr("r", calculateRadius);
	}

	function calculateRadius(d) {
		switch(radius_type) {
			case 'pages':
    			if (d.pages_numeric)
					return Math.max(2,d.pages_numeric / 50);
				else
					return 2;
				break;
			case 'shelfrank':
				if (d.shelfrank)
					return Math.max(2,d.shelfrank / 5);
				else
					return 2;
				break;
			case 'same':
				return 5;
				break;
		}
	}
    return self;
}();