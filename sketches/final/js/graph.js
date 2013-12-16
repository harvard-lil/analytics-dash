var lc = lc || {};

lc.graph = function() {
	var height = 500,
        gHeight = height-20,
        width,
        gWidth,
        bookData,
        numBooks,
        currentBook;

    var circleColor = "blue";

    // default scaling / axes
    var x_axis_type = "chronological_x";
    var y_axis_type = "call_number_sort_order_y";
	var radius_type = "shelfrank";

	var formatAsYear= d3.format("04d");

	var svg = d3.select("#graph").attr("height",height).attr("width","85%");
    width = $("#graph").width(),
    gWidth = width*.95;

    yearEnd = 2013;
	var timescale = d3.scale.linear().domain([1850,yearEnd]).range([0,gWidth]);

	var xscale = d3.scale.linear().domain([1850,yearEnd]).range([0,gWidth]);

	var yscale = d3.scale.linear().domain([0,16000000]).range([gHeight, 0]);

	var rscale = d3.scale.linear().domain([0,300]).range([2, 30]);

	var linkouturl = "http://holliscatalog.harvard.edu/?itemid=|library/m/aleph|009455802";
	
    svg.append("clipPath").attr("id","graph-box")
    	.append("rect").attr("width",gWidth).attr("height",gHeight);

    var circleGroup = svg.append("g").attr("class","circles").attr("transform","translate("+(width*.025)+",0)").attr("clip-path","url(#graph-box)");

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
    		.attr("transform","translate("+ (width*.025) +"," + gHeight +")");

    	// axes.append("g")
    	// 	.attr("class", "axis")
    	// 	.attr("id","yAxis")
    	// 	.attr("transform","translate(120,0)");

        // axes.append("text")
  	     //    .attr("class","axis_labels")
	       //  .attr("id","y_axis")
	       //  .text("Overall Popularity")
	       //  .attr("text-anchor","middle")
	       //  .attr("transform","translate(35,"+(height/2)+") rotate(-90)")
    }
    //defines function that ads labels to the axes

    appendAxes();

    function updateAxes() {
		axes.select("#xAxis").call(xAxis);
		axes.select("#yAxis").call(yAxis);

		// if (y_axis_type == 'call_number_sort_order_y') {
		// 	$("#yAxis").hide();
		// 	lc.subjectgraph.show();
		// } else {
		// 	$("#yAxis").show();
		// 	lc.subjectgraph.hide();
		// }
	}

	var minYear, maxYear;

	self.dataPrep = function(data) {
		var min = d3.min(data,function(d){ return d.pub_date_numeric; });
		var max = d3.max(data,function(d){ return d.pub_date_numeric; });
		self.updateDateRange(min,max);

		// var LCClow = d3.min(data,function(d){ if (d.loc_call_num_sort_order) return d.loc_call_num_sort_order[0]; });
		// var LCChigh = d3.max(data,function(d){ if (d.loc_call_num_sort_order) return d.loc_call_num_sort_order[0]; });
		// self.updateLCCRange(LCClow, LCChigh);
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

	self.clearCircles = function() {
		var c = circleGroup.selectAll("circle").data([]);
		c.exit().transition().attr("r",0).remove();
	}

	self.appendCircles = function(data) {
		bookData = data;
		numBooks = data.length;

		var undefs = [],
			defs = [];
		for (var i = data.length-1; i >= 0; i--) {
			if (!data[i].call_num) {
				undefs.push(data[i]);
			} else {
				defs.push(data[i]);
			}
		}
		defs.sort(function(a,b){
			if (a.loc_call_num_sort_order && b.loc_call_num_sort_order)
				return a.loc_call_num_sort_order[0] - b.loc_call_num_sort_order[0];
			else return 1;
		});
		var newData = defs.concat(undefs);
		lc.list.saveDocs(newData);

		console.log(newData.length, defs.length, undefs.length)

        var circles = circleGroup.selectAll("circle").data(newData);
        circles.exit().remove();
        //binds data to circles
        circles.enter().append("circle");

        //runs the showInfo on mouseover
        circles.on("mouseover",function(d){
            lc.tooltip.show(d);
        }).on("mouseout", function(d) {
        	lc.tooltip.hide();
        }).on("click",function(d){
	        lc.tooltip.show(d);
	        self.showInfo(d, true);
	        circles.classed("selected",false);
	        d3.select(this).classed("selected",true);
	        this.parentNode.appendChild(this);
        });

        updateCircles();
        // self.updateLabels(0);
        sortBooks("title", true);
    }
    function updateCircles() {
    	var circles = circleGroup.selectAll("circle");
    	var delayScale = d3.scale.linear().domain([0,500]).range([5,.5]),
    		delay = delayScale(numBooks);

    	circles.attr("fill",function(d){
	        if (d.call_num) {
	        	if (lcObjectArray[d.call_num[0].substr(0,1)]) {
		        	var colorname = d.call_num[0].substr(0,1);
		        	return lcObjectArray[d.call_num[0].substr(0,1)].color;
		        } else return "#808080";
        	} else {
	         	return "black";
	        }
		}).attr("id",function(d){ return "c-"+d.id; })
		.transition()
		.delay(function(d,i){
			return i*delay;
		})
		.duration(500)
		.attr("cx", function(d,i) { /*console.log(minYear, maxYear, d.pub_date_numeric);*/ return calculateX(d); })
		.attr("cy", function(d,i){ return calculateY(i); })
		.attr("r", calculateRadius);

    }

    function classNameify(name) {
        return "t-"+String(name).replace(/^\s+|\s+$/g,'').toLowerCase().replace(/[^\w\s]/gi, '').split(" ").join("-");
    }

    self.updateLabels = function(level) {
    	d3.select(".schema text").classed("b",false);
		circleGroup.selectAll("circle").each(function(d){
			if (!d.loc_call_num_subject) return;
			var title = d.loc_call_num_subject.split("--")[level];
			if (title) {
				d3.selectAll("text."+classNameify(title)).classed("b",true);
			}
		})
    };


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
    });
    $(document).keydown(function (e) {
		if (e.keyCode == 38) { // up arrow
		 	sortBooks("loc_call_num_sort_order",false);
		} else if (e.keyCode == 40) { // down arrow
		 	sortBooks("loc_call_num_sort_order",true);
		} else if (e.keyCode == 37) { // left arrow
		 	sortBooks("pub_date_numeric",false);
		} else if (e.keyCode == 39) { // right arrow
		 	sortBooks("pub_date_numeric",true);
		}
	});


    function sortBooks(sortBy, dir) {
    	bookData.sort(function(a,b){
  			if (a[sortBy] < b[sortBy])
  				return -1;
  			if ((a[sortBy] > b[sortBy]))
  				return 1;
  			return 0;
    	});
    	var index = (bookData.indexOf(currentBook) + (dir ? 1 : -1) + bookData.length)%bookData.length;
    	showInfo(bookData[index],true);
    	circleGroup.selectAll("circle").classed("selected",false);
    	circleGroup.select("#c-"+bookData[index].id).classed("selected",true);
    }

    self.showInfo = function(data, inBox) {
    	currentBook = data;

    	$(".sort-heading").find(".index").text(bookData.indexOf(currentBook) + 1);

		if (data.id_inst){
			info.select(".title .field").html("<a target='blank' href=http://holliscatalog.harvard.edu/?itemid=|library/m/aleph|"+ data.id_inst+">"+data.title+"</a>");
		}		
		else{
        	info.select(".title .field").text(data.title);
       	}
        if (data.creator) {
            info.select(".creator .field").html("<li>" + data.creator.join("</li><li>") + "</li>");
            info.selectAll(".creator li").on("click",function(){
	            lc.search.runSearch({
					"creator": $(this).text()
				});
            });
        }

        if (data.call_num && lcObjectArray[data.call_num[0].substr(0,1)]) {
        	var c = lcObjectArray[data.call_num[0].substr(0,1)].color
        	$(".info-bar").css("background-color",c);
        } else {
        	$(".info-bar").css("background-color","#808080");
        }

		if (data.call_num)
        	info.select(".lc .field").html(data.call_num[0].split("%%").join("<br>"));
        else
       		info.select(".lc .field").html("Not Available");

        info.select(".pub_date_numeric .field").text(data.pub_date_numeric);

        info.select(".pages_numeric .field").text(data.pages_numeric ? data.pages_numeric : "Format: "+data.format);

        if (data.language)
			info.select(".language .field").text(data.language);

		if (data.loc_call_num_subject) {
			info.select(".loc_call_num_subject .field").text(data.loc_call_num_subject)
				.on("click",function(){
	            	lc.search.runSearch({
						"loc_call_num_subject": $(this).text()
					});
	            });
		}

		if (data.lcsh) {
            info.select(".lcsh .field").html("<li class='c'>" + data.lcsh.join("</li><li>") + "</li>");
            
            info.selectAll(".lcsh li").on("click",function(){
            	lc.search.runSearch({
					"lcsh_keyword": $(this).text()
				});
            });
		}

		if (data.id_inst){
			linkouturl= "href=http://holliscatalog.harvard.edu/?itemid=|library/m/aleph|"+ data.id_inst;
		}
		
  		if (inBox) {
  			addToCarrel.text("Add This Item To Your Carrel").on("click",function(){
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
		Rollover listener
    */
    $("#graph").mousemove(function(e) {
    	if (y_axis_type=='call_number_sort_order_y')
    		lc.subjectgraph.rollover(e.offsetY);
    }).mouseout(function(){
    	if (y_axis_type=='call_number_sort_order_y')
    		lc.subjectgraph.rollout();
    }).click(function(e) {
    	if (e.target.nodeName != "circle")
    		lc.subjectgraph.graphClick(e.offsetY);
    });

    /*

		Axes toggle and Scale toggle buttons

    */
    // $(".x_toggle span").click(x_axis_button);
    // $(".y_toggle li").click(y_axis_button);
    $(".scale_toggle li").click(radius_button);

	$("#export-all").click(function(){
		lc.carrel.exportAll(bookData);
	})

	var sortTitles = {
		"call_number_sort_order_y" : "subject",
		"grads" : "Graduate Students",
		"undergrads" : "Undergraduate Students",
		"faculty" : "faculty",
		"popularity_y" : "overall popularity"
	}

	function y_axis_button(e){
		y_axis_type = $(e.target).attr("name");

		$(".y_toggle li").removeClass("selected");
		$(this).addClass("selected");

		set_y_axis();
		axes.select("#y_axis").text(sortTitles[y_axis_type]);
	}

	function radius_button(e){
		radius_type = $(e.target).attr("name");

		$(".scale_toggle li").removeClass("selected");
		$(this).addClass("selected");

		set_radius();
	}

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
		return (d / numBooks) * (gHeight*.99) + (gHeight*.005);
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
		            yscale.domain([8000000,0]);
		            // return yscale(d.loc_call_num_sort_order[0])
		            // return lc.subjectgraph.calculateY(d.loc_call_num_sort_order[0]);
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
		rscale.domain([0,250]);
		switch(radius_type) {
			// case 'pages':
   //  			if (d.pages_numeric)
			// 		return Math.max(3,d.pages_numeric / 50);
			// 	else
			// 		return 3;
			// 	break;
			case 'grads':
				return  rscale(d.score_checkouts_grad || 0);
			case 'undergrads':
				return  rscale(d.score_checkouts_undergrad || 0);
			case 'faculty':
				return  rscale(d.score_checkouts_fac || 0);
			case 'shelfrank':
				if (d.shelfrank)
					return Math.max(3,d.shelfrank / 5);
				else
					return 3;
				break;
			case 'same':
				return 6;
				break;
		}
	}
    return self;
}();