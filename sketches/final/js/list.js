var lc = lc || {};

lc.list = function() {

    var documents;
    var visWrapper = $(".right-half"),
        list = d3.select("#list");

    $("#show-list").click(function(){
        self.showList();
    });
    $("#show-graph").click(function(){
        self.hideList();
    });

    self.saveDocs = function(docs) {
        documents = docs;
    };

    self.showList = function() {

        visWrapper.addClass("list");

        var items = list.selectAll("li").data(documents);
        var entering = items.enter().append("li").attr("class","item");

        items.exit().remove();

        items.html(function(d){
                return "<span class='left'><span class='title'>" + d.title + "</span>, " + (d.creator ? d.creator.join(", ") : "") +
                    "</span><span class='right'>"+ (d.loc_call_num_subject ? d.loc_call_num_subject.split("--")[0] : "") +" | " + d.pub_date_numeric + "</span>";
            }).style("border-bottom-color", function(d){
                if (d.call_num && lcObjectArray[d.call_num[0].substr(0,1)]){
                    return lcObjectArray[d.call_num[0].substr(0,1)].color;
                }
            }).on("click",function(d){
                lc.graph.showInfo(d);
            }).on("dblclick",function(d){
                lc.carrel.sendToCarrel(d);
            });
    };

    self.hideList = function() {
        visWrapper.removeClass("list");
    };

    $(".list-sort-by li").click(function(){
        self.sortList($(this).attr("name"));
    });

    self.sortList = function(sorter) {
        list.selectAll("li").sort(function(a,b){
            return d3.ascending(a[sorter], b[sorter]);
        });
    };

    return self;
}();