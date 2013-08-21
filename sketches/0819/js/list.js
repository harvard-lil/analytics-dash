var lc = lc || {};

lc.list = function() {

    var list = d3.select("#list ul");

    self.showList = function(docs) {
        var items = list.selectAll("li").data(docs);
        items.enter().append("li");
        items.exit().remove();

        items.append("h2")
            .attr("class","title")
            .text(function(d){
                return d.title;
            }).style("border-bottom-color", function(d){
                if (d.call_num){
                    return lcObjectArray[d.call_num[0].substr(0,1)].color;
                }
            });
        items.append("a").text("Add To Carrel")
            .on("click",function(d){
                lc.carrel.sendToCarrel(d);
            });
        items.append("p")
            .text(function(d){
                if (d.loc_call_num_subject)
                    return d.loc_call_num_subject;
            });
        items.on("mouseover",function(d){
            lc.graph.showInfo(d);
        });
    }

    return self;
}();