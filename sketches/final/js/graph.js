var lc = lc || {};

lc.graph = function() {
	var height = 500,
        gHeight = height-20,
        width,
        gWidth,
        bookData,
        numBooks,
        currentBook;

	var radius_type = "shelfrank";

	var formatAsYear= d3.format("04d");

	var svg = d3.select("#graph").attr("height",height).attr("width","91%");
    width = $("#graph").width(),
    gWidth = width*.95;

    yearEnd = 2013;
	var xscale = d3.scale.linear().domain([1850,yearEnd]).range([0,gWidth]);

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

    function appendAxes() {
    	axes.append("g")
    		.attr("class", "axis")
    		.attr("id","xAxis")
    		.attr("transform","translate("+ (width*.025) +"," + gHeight +")");
    }

    appendAxes();

	var minYear, maxYear;

	self.dataPrep = function(data) {
		var min = d3.min(data,function(d){ return d.pub_date_numeric; });
		var max = d3.max(data,function(d){ return d.pub_date_numeric; });
		self.updateDateRange(min,max);
	};

	self.updateDateRange = function(min, max) {
		minYear = min - .5, maxYear = max + .5;
		xscale.domain([minYear,maxYear]);
		axes.select("#xAxis").call(xAxis);
		updateCircles();
	};

	self.clearCircles = function() {
		var c = circleGroup.selectAll("circle").data([]);
		c.exit().transition().attr("r",0).remove();
	};

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

        var circles = circleGroup.selectAll("circle").data(newData);
        //binds data to circles
        circles.enter().append("circle");

        //runs the showInfo on mouseover
        circles.on("mouseover",function(d){
            lc.tooltip.show(d);
        }).on("mouseout", function(d) {
        	lc.tooltip.hide();
        }).on("click",function(d){
	        lc.tooltip.show(d);
	        self.showInfo(d);
	        circles.classed("selected",false);
	        d3.select(this).classed("selected",true);
        });

        updateCircles();
        circles.exit().remove();
        sortBooks("title", true);
    };

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
		.attr("cx", calculateX)
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
    	if (sortBy == "loc_call_num_sort_order")
    		bookData.sort(function(a,b){
	    		if (!a.loc_call_num_sort_order || !b.loc_call_num_sort_order) return;
	  			if (a.loc_call_num_sort_order[0] < b.loc_call_num_sort_order[0])
	  				return -1;
	  			if (a.loc_call_num_sort_order[0] > b.loc_call_num_sort_order[0])
	  				return 1;
	  			return 0;
	    	});
	    else
	    	bookData.sort(function(a,b){
	  			if (a[sortBy] < b[sortBy])
	  				return -1;
	  			if (a[sortBy] > b[sortBy])
	  				return 1;
	  			return 0;
	    	});
	    	
    	var index = (bookData.indexOf(currentBook) + (dir ? 1 : -1) + bookData.length)%bookData.length;
    	showInfo(bookData[index]);
    	circleGroup.selectAll("circle").classed("selected",false);
    	circleGroup.select("#c-"+bookData[index].id).classed("selected",true);
    }

    self.showInfo = function(data) {
    	currentBook = data;
		self.clearInfo();

		if (data.id_inst)
			info.select(".title .field").html("<a target='blank' href=http://holliscatalog.harvard.edu/?itemid=|library/m/aleph|"+ data.id_inst+">"+data.title+"</a>");
		else
        	info.select(".title .field").text(data.title);
       	
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

        info.select(".lc .field").html(data.call_num ? data.call_num.join("<br>") : "Not Available");
        info.select(".pub_date_numeric .field").text(data.pub_date_numeric ? data.pub_date_numeric : "Not Available");
        info.select(".pages_numeric .field").text(data.pages_numeric ? data.pages_numeric : "Format: "+data.format);
		info.select(".language .field").text(data.language ? data.language : "Not Available");

		if (data.loc_call_num_subject) {
			info.select(".loc_call_num_subject .field")
				.html("<li>" + data.loc_call_num_subject.join("</li><li>") + "</li>");
			info.selectAll(".loc_call_num_subject li")
				.on("click",function(){
	            	lc.search.runSearch({
						"loc_call_num_subject_keyword": $(this).text()
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

		self.showCircInfo(data);
		
  		if (!lc.carrel.bookInCarrel(data)) {
  			addToCarrel.text("Add This Item To Your Stack").on("click",function(){
	            lc.carrel.sendToCarrel(data);
	        });
  		} else {
  			addToCarrel.text("Remove This Item From Your Stack").on("click",function(){
	            lc.carrel.removeFromCarrel(data);
	            info.select("#add-to-carrel").text("Add This Item To Your Stack").on("click",function(){
		            lc.carrel.sendToCarrel(data);
		        });
	        });
  		}
    };

    self.showCircInfo = function(data) {
    	var scores = ["shelfrank","score_downloads","score_holding_libs","score_recalls","score_checkouts_undergrad",
    	"score_checkouts_grad","score_checkouts_fac","score_total"];

    	scores.forEach(function(s,i){
    		var d = info.select("."+s);
    		if (data[s])
    			d.style("display","block").select(".field").text(data[s]);
    		else d.style("display","none");
    	});
    }

    self.clearInfo = function() {
           info.select(".creator .field").html("Not Available");
           info.select(".title .field").html("Not Available");
           info.select(".creator .field").html("Not Available");
           info.selectAll(".creator li").html("Not Available");
		   info.select(".loc_call_num_subject .field").html("Not Available");
		   info.selectAll(".loc_call_num_subject li").html("Not Available");
           info.select(".lcsh .field").html("Not Available");
           info.selectAll(".lcsh li").html("Not Available");
    };

    self.clearInspector = function(){
    	info.selectAll(".field").text("");
    };

    /*
		Rollover listener
    */
    $("#graph").mousemove(function(e) {
    	lc.subjectgraph.rollover(e.offsetY);
    }).mouseout(function(){
    	lc.subjectgraph.rollout();
    }).click(function(e) {
    	if (e.target.nodeName != "circle") {
    		lc.subjectgraph.graphClick(e.offsetY);
    		lc.subjectgraph.rollover(e.offsetY);
    	}
    });

    $(".scale_toggle li").click(radius_button);

	$("#export-all").click(function(){
		lc.carrel.exportAll(bookData);
	})

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

	function calculateY(d) {
		return (d / numBooks) * (gHeight*.99) + (gHeight*.005);
	}

	function set_radius(){
		var circles = circleGroup.selectAll("circle");
			circles.transition()
				.duration(500)
				.attr("r", calculateRadius);
	}

	var minR = 5,
		maxR = 20;

	function calculateRadius(d) {
		rscale.domain([0,300]);
		rscale.range([minR,maxR]);
		switch(radius_type) {
			case 'grads':
				return  Math.min(maxR, rscale(d.score_checkouts_grad || 0));
			case 'undergrads':
				return  Math.min(maxR, rscale(d.score_checkouts_undergrad || 0));
			case 'faculty':
				return  Math.min(maxR, rscale(d.score_checkouts_fac || 0));
			case 'shelfrank':
				if (d.shelfrank){
					rscale.domain([0,100]);
					return Math.min(maxR, rscale(d.shelfrank));
				} else
					return minR;
			case 'same':
				return minR;
				break;
		}
	}
    return self;
}();