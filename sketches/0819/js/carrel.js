var lc = lc || {};

lc.carrel = function() {

    var carrel = [],
        carrelBox = d3.select("#carrel-box ul");

    $("#export-carrel").click(function(){
        exportCarrel();
    });
    
    self.sendToCarrel = function(bookData) {
        carrel.push(bookData);
        updateCarrelBoxes();
    };

    self.removeFromCarrel = function(bookData) {
        var index = carrel.indexOf(bookData);
        carrel.splice(index,1);
        updateCarrelBoxes();
    }

    function updateCarrelBoxes() {
        var carrelBoxes = carrelBox.selectAll("li").data(carrel);
        carrelBoxes.enter().append("li");
        carrelBoxes.exit().remove();

        carrelBoxes.style("background-color",function(d){
            if (d.call_num){
                return lcObjectArray[d.call_num[0].substr(0,1)].color;
            } else {
                return "black";
            }
        }).on("click",function(d){
            lc.graph.showInfo(d, false);
        });
    }

    self.exportCarrel = function() {
        var headings = ["title", "creator", "publisher", "call_num", "holding_libs", "lcsh", "score_holding_libs", "id_isbn", "id",  "title_sort", "score_checkouts_undergrad", "height", "title_link_friendly", "score_checkouts_grad", "pub_date", "loc_call_num_subject", "pub_location", "ut_id", "pages", "loc_call_num_sort_order", "score_checkouts_fac", "data_source", "dataset_tag", "score_recalls", "shelfrank",  "language", "id_inst", "ut_count", "id_oclc", "note", "format",  "pub_date_numeric", "source_record"];
        var csv = [headings];

        carrel.forEach(function(item,i){
            var book = [];
            for (d in item) {
                book.push(item[d]);
            }
            csv.push(book);
        });

        download(csv, "dowload.csv", "text/csv");
    };

    /*
        outline of how to download csv, it will auto-download in chrome, firefox, and IE
        for safari, it will open in a new tab and users will have to save as .csv
        to do: actually get the correct data showing up in the csv, parse out the objects into strings
    */
    function download(strData, strFileName, strMimeType) {
        var D = document,
            A = arguments,
            a = D.createElement("a"),
            d = A[0],
            n = A[1],
            t = A[2] || "text/plain";

        //build download link:
        a.href = "data:" + strMimeType + "," + escape(strData);

        if (window.MSBlobBuilder) { // IE10
            var bb = new MSBlobBuilder();
            bb.append(strData);
            return navigator.msSaveBlob(bb, strFileName);

        } else if ('download' in a) { //FF20, CH19
            a.setAttribute("download", n);
            a.innerHTML = "downloading...";
            D.body.appendChild(a);
            setTimeout(function() {
                var e = D.createEvent("MouseEvents");
                e.initMouseEvent("click", true, false, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
                a.dispatchEvent(e);
                D.body.removeChild(a);
            }, 66);
            var f = D.createElement("iframe");
            D.body.appendChild(f);
            f.src = "data:" + (A[2] ? A[2] : "application/octet-stream") + (window.btoa ? ";base64" : "") + "," + (window.btoa ? window.btoa : escape)(strData);
            setTimeout(function() {
                D.body.removeChild(f);
            }, 333);

        } else { //safari
            var csvContent = "data:text/csv;charset=utf-8,";
            strData.forEach(function(item, i){
               var dataString = item.join(",");
               csvContent += (i < carrel.length) ? dataString+ "\n" : dataString;
            });
            var encodedUri = encodeURI(csvContent);
            window.open(encodedUri);
        }
    }

    return self;
}();