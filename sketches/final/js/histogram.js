var lc = lc || {};

lc.histogram = function() {

    var gHeight = 40,
        hHeight = $(window).height() - 290,
        chart = d3.select("#histogram").style("top",hHeight+"px")
            .select("svg").attr("width","100%").attr("height",gHeight),
        histoGroup = chart.insert("g","text"),
        gWidth = $("#histogram").width(),
        booksByYear,
        minYear,
        maxYear,
        changeRange = false;

    self.appendHistogram = function(data) {

        booksByYear = d3.nest().key(function(d){
            if (d["pub_date_numeric"])
                return d["pub_date_numeric"];
        }).entries(data).sort(function(a,b){
            return a.key - b.key;
        });

		
        minYear = parseInt(d3.min(booksByYear,function(d){ if (d.key != "undefined") return d.key; }));
        maxYear = parseInt(d3.max(booksByYear,function(d){ if (d.key != "undefined") return d.key; }));
        var yearRange = maxYear - minYear,
            maxBooks = d3.max(booksByYear,function(d){ return d.values.length; });

        var yearScale = d3.scale.linear().domain([minYear,maxYear]).range([0,gWidth-(gWidth/(yearRange))]),
            bookScale = d3.scale.linear().domain([0,maxBooks]).range([3,gHeight]);

        var bars = histoGroup.selectAll("rect").data(booksByYear);

        bars.enter().append("rect");
        bars.exit().remove();

        bars.attr("fill","#808080")
            .attr("width",function(){
                return (gWidth/yearRange)*((yearRange-1)/yearRange);
            }).attr("height",function(d){
                return bookScale(d.values.length);
            }).attr("y",function(d){
                return gHeight - bookScale(d.values.length);
            }).attr("x",function(d){
                if (d.key != "undefined")
                    return yearScale(d.key);
            }).attr("opacity",function(d){
                if (d.key == "undefined")
                    return 0;
            });
            // .on("mouseover",function(d){
            //     showCounts(d);
            // }).on("mouseout",function(d){
            //     hideCounts();
            // });

        // var text = chart.select("text");

        // function showCounts(d) {
        //     var num = d.values.length;
        //     text.text(num)
        //         .attr("x",yearScale(d.key) + (gWidth/yearRange)*((yearRange-1)/yearRange)/2)
        //         // .attr("y",function(){ return gHeight - bookScale(d.values.length) - 2; });
        //         .attr("y",8)
        // }

        $("#histogram .reset").click(function(){
            setSlider(minYear, maxYear)
        });

        $("#slider-range").slider({
            range: true,
            min: minYear,
            max: maxYear,
            values: [ minYear, maxYear ],
            slide: function( event, ui ) {
                changeRange = true;
                setSlider(ui.values[0], ui.values[1]);
            }
        });
        setSlider(minYear, maxYear);
    };

    self.returnYearRange = function(){
        if (changeRange)
            return [minYear, maxYear];
    };

    self.setYearRange = function(range) {
        setSlider(range[0], range[1]);
    }

    function setSlider(min, max) {
        minYear = min;
        maxYear = max;
        $("#slider-range").slider("values",[minYear, maxYear]);
        $(".ui-slider-handle:first").text(minYear);
        $(".ui-slider-handle:last").text(maxYear);
        histoGroup.selectAll("rect").attr("fill",function(d){
            if ((d.key >= minYear) && (d.key <= maxYear))
                return "#808080";
            else
                return "#ddd";
        });
        lc.graph.updateDateRange(minYear,maxYear);
    }

    return self;
}();