var lc = lc || {};

lc.list = function() {

    var documents;
    var list = d3.select("#list ul");

    $("#show-list").click(function(){
        self.showList();
    });

    self.saveDocs = function(docs) {
        documents = docs;
    };

    self.showList = function() {
        list.style("display","block");

        var items = list.selectAll("li").data(documents);
        var entering = items.enter().append("li");
        entering.append("h2").attr("class","title");
        entering.append("a");
        entering.append("p");

        items.exit().remove();

        items.select("h2")
            .text(function(d){
                return d.title;
            }).style("border-bottom-color", function(d){
                if (d.call_num){
                    return lcObjectArray[d.call_num[0].substr(0,1)].color;
                }
            });
        items.select("a").text("Add To Carrel")
            .on("click",function(d){
                lc.carrel.sendToCarrel(d);
            });
        items.select("p")
            .text(function(d){
                if (d.loc_call_num_subject)
                    return d.loc_call_num_subject;
            });
        items.on("mouseover",function(d){
            lc.graph.showInfo(d);
        });
    };
    
    self.hideList = function() {
        list.style("display","none");
    };

    return self;
}();