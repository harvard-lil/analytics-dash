// create a schema global object to contain functions dealing with data manipulation
// this uses the module pattern to store the data
var schema = function() {
	var self = {};
	var allData = {};

	// red to green
	var startColor = d3.hsl(0, 1, .5);
	var endColor = d3.hsl(330, 1, .5);

	var depthData = [[], [], [], [], [], [], [], []];

	// public way to parse a csv hierarchy
	self.parseCSV = function(csv) {
		// loop through each row and roll up each level of classification
		var i = 0;
		csv.forEach(function(d) {
			parseClass(d);

			// get the first character
			var a = d.ClassLetters.charAt(0);
			// get the first two characters
			var aa = d.ClassLetters.substr(0, 2);

			var aaa = d.ClassLetters.substr(0, 3);

			var rollup;
			if (!allData[a]) {
				allData[a] = makeEmptyRollup(d, 0);
				depthData[0].push(allData[a]);
			} else {
				if (!allData[a].sublevels[aa]) {
					rollup = makeEmptyRollup(d, 1);
					allData[a].sublevels[aa] = rollup;
					rollup.parent = allData[a];
					depthData[1].push(rollup);
				} else if (aaa.length == 3 && !allData[a].sublevels[aa].sublevels[aaa]) {
					rollup = makeEmptyRollup(d, 1);
					allData[a].sublevels[aa].sublevels[aaa] = rollup;
					rollup.parent = allData[a].sublevels[aa];
					depthData[2].push(rollup);
				}

				if (aaa.length == 3) {
					recurse(allData[a], allData[a].sublevels[aa].sublevels[aaa], d, '');
				} else {
					// recurse regardless of aa length because sometimes we have single letter categories with sublevels [ie 'B', 'E', and 'F']
					recurse(allData[a], allData[a].sublevels[aa], d, '');
				}
			}
		});

		self.data = allData;

		// in case we need to inspect our generated hierarchy
		console.log(self.data);
	};

	var tracing = false;
	function recurse(parentData, data, row, inSpace) {
		for (var sub in data.sublevels) {
			var sublevel = data.sublevels[sub];
			if (self.contains(sublevel, row)) {

				inSpace += '    ';
				if (tracing) {
					// console.log(inSpace, row.className, 'can go deeper, checking', sublevel.className);
				}

				recurse(data, sublevel, row, inSpace);
				return;
			}
		}

		if (tracing) {
			console.log(inSpace, row.className, 'is new sublevel of', data.className, 'depth:', inSpace.length / 4);
		}

		parentData.count++;
		data.count++;
		var rollup = makeEmptyRollup(row, (inSpace.length / 4) + 2);
		data.sublevels[row.className] = rollup;
		rollup.parent = data;

		if (depthData[rollup.depth])
			depthData[rollup.depth].push(rollup);

		// data.children.push(rollup);
		// console.log(data, data.children.length);
	}

	function parseClass(d) {
		d.begin = Math.floor(d.ClassNumBegin);
		d.end = d.ClassNumEnd == '-1' ? d.begin : Math.floor(d.ClassNumEnd);
		d.diff = Math.floor(d.ClassNumDiff);
		d.className = d.ClassLetters + d.begin + '-' + d.end;
		d.circs = [];

		// parse circulation events
		// using the +String syntax learned from Mike Bostock
		var prefix = 'CircEvents';
		for (var i = 2000; i <= 2010; i++) {
			d.circs.push(+d[prefix + i] || 0);
		}

		d.books = [];
		d.rolledUpBooks = [];
		d.rolledUpCircs = [];

		// parse book nums
		// using the +String syntax learned from Mike Bostock
		var prefix = 'NumBooksPubYear';
		var runningTotal = +d.TotalNumBooksThroughPubYear1999;
//		var runningTotal = 0;

		for (var i = 2000; i <= 2010; i++) {
			d.books.push(+d[prefix + i]);

			runningTotal += (+d[prefix + i]);
			d.rolledUpBooks.push(runningTotal);
		}
		var circPrefix = 'CircEvents';
		var runningCircTotal=0;
		for (var i = 2002; i <= 2010; i++) {
			runningCircTotal += (+d[circPrefix + i]);
			d.rolledUpCircs.push(+d[circPrefix + i]);
		}
		d.totalCirc = runningCircTotal;
		d.totalBooks = runningTotal;

		return d;
	}

	function makeEmptyRollup(d, depth) {
		return {
			// a little confusing because I want to keep the capitalization of the columns the same as in the csv
			// but camelCase for parsed variables
			// not sure if we should just standardize it anyways though
			ClassLetters: d.ClassLetters,
			ClassSubject: d.ClassSubject,
			ClassNumBegin: d.ClassNumBegin,
			ClassNumEnd: d.ClassNumEnd,
			ClassNumDiff: d.ClassNumDiff,
			ClassSubjectFull: d.ClassSubjectFull,
			totalBooks: d.totalBooks,
			totalCirc: d.totalCirc,
			begin: Math.floor(d.ClassNumBegin),
			end: Math.floor(d.ClassNumEnd),
			diff: Math.floor(d.ClassNumDiff),
			depth: depth,
			count: 0,
			books: d.books,
			rolledUpBooks: d.rolledUpBooks,
			rolledUpCircs: d.rolledUpCircs,
			circs: d.circs,
			name: d.ClassSubject,
			className: d.className,
			sublevels: {},
			children: []
		};
	}

	// data accessing/comparing functions
	self.contains = function(a, b) {
		if (!a || !b) {
			return false;
		}

		if (a.begin <= b.begin && a.end >= b.end) {
			return true;
		} else if (a.begin <= b.begin && a.end >= b.begin && b.end == -1) {
			return true;
		} else {
			return false;
		}
	};

	self.colorClass = function(classID) {
   		var firstChar = classID.charCodeAt(0);
   		// interpolate between start and end color
		var percent = ((firstChar - 65) / 25);

		// // go from 0 to 330 hue
   		// return d3.hsl(percent * (endColor.h - startColor.h), 1, .5);
   		return lcObjectArray[classID.substr(0,1)].color;
   		
	};

	self.color = function(row, modifier) {
   		var firstChar = row.ClassLetters.charCodeAt(0);
   		// interpolate between start and end color
   		console.log("hi");

   		var add = 0;
   		if (modifier) {
   			add = modifier % 2 == 0 ? 0 : .025;
   		}

		var percent = ((firstChar - 65) / 25) + add;

		// go from 0 to 330 hue
   		return d3.hsl(percent * (endColor.h - startColor.h), 1, .5);
	};

	self.depth = function(i) {
		return depthData[i];
	};

	self.rollUpCircs = function(data) {
		var rollup = [0, 0, 0, 0, 0, 0, 0, 0, 0];
		for (var i in data) {
			var d = data[i];
			for (var j = 0; j < d.rolledUpCircs.length; j++) {
				rollup[j] += d.rolledUpCircs[j];
			}
		}

		return {
			rolledUpCircs: rollup
		};
	};

	self.makeEndData = function(d) {
		var e = {};
		for (var i in d) {
			e[i] = d[i];
		}

		e.parent = d;
		e.depth ++;
		e.endblock = true;

		return e;
	};

	return self;
}();


var lcObjectArray = {
	"A":{
		color: "#6C6C79",
		subject: "General Works"
	},
	"B":{
		color: "#CC0000",
		subject: "Philosophy, Psychology, Religion"
	},
	"C":{
		color: "#CC3333",
		subject: "Auxillary Sciences of History"
	},
	"D":{
		color: "#FF0048",
		subject: "History: General & Outside the Americas"
	},
	"E":{
		color: "#FF8659",
		subject: "History: United States"
	},
	"F":{
		color: "#FF991A",
		subject:  "History: United States Local & America"
	},
	"G":{
		color: "#99CC00",
		subject:  "Geography, Anthropology, Recreation"
	},
	"H":{
		color: "#00B55E",
		subject:  "Social Sciences"
	},
	"J":{
		color: "#3366FF",
		subject:  "Political Science"
	},
	"K":{
		color: "#9900CC",
		subject:  "Law"
	},
	"L":{
		color: "#8DCEFC",
		subject:  "Education"
	},
	"M":{
		color: "#FF66CC",
		subject:  "Music"
	},
	"N":{
		color: "#993300",
		subject:  "Fine Arts"
	},
	"P":{
		color: "#999",
		subject:  "Language and Literature"
	},
	"Q":{
		color: "#FFDC00",
		subject:  "Science"
	},
	"R":{
		color: "#269900",
		subject:  "Medicine"
	},
	"S":{
		color: "#FFFF66",
		subject:  "Agriculture"
	},
	"T":{
		color: "#216675",
		subject:  "Technology"
	},
	"U":{
		color: "#FFDC00",
		subject:  "Military Science"
	},
	"V":{
		color: "#000563",
		subject:  "Naval Science"
	},
	"Z":{
		color: "#CC0000",
		subject:  "Library Science & Information Resources"
	}
};
// var lcObjectArray = {
// 	"A":{
// 		color: "#6C6C79",
// 		subject: "General Works"
// 	},
// 	"B":{
// 		color: "#006582",
// 		subject: "Philosophy, Psychology, Religion"
// 	},
// 	"C":{
// 		color: "#77BDAE",
// 		subject: "Auxillary Sciences of History"
// 	},
// 	"D":{
// 		color: "#0000FF",
// 		subject: "History: General & Outside the Americas"
// 	},
// 	"E":{
// 		color: "#FF2D21",
// 		subject: "History: United States"
// 	},
// 	"F":{
// 		color: "#FF2D21",
// 		subject:  "History: United States Local & America"
// 	},
// 	"G":{
// 		color: "#97441B",
// 		subject:  "Geography, Anthropology, Recreation"
// 	},
// 	"H":{
// 		color: "#00B55E",
// 		subject:  "Social Sciences"
// 	},
// 	"J":{
// 		color: "#FFB092",
// 		subject:  "Political Science"
// 	},
// 	"K":{
// 		color: "#6D57D8",
// 		subject:  "Law"
// 	},
// 	"L":{
// 		color: "#8DCEFC",
// 		subject:  "Education"
// 	},
// 	"M":{
// 		color: "#FF69B4",
// 		subject:  "Music"
// 	},
// 	"N":{
// 		color: "#00ffdb",
// 		subject:  "Fine Arts"
// 	},
// 	"P":{
// 		color: "#00b3ff",
// 		subject:  "Language and Literature"
// 	},
// 	"Q":{
// 		color: "#FFC536",
// 		subject:  "Science"
// 	},
// 	"R":{
// 		color: "#00FF40",
// 		subject:  "Medicine"
// 	},
// 	"S":{
// 		color: "#FFC536",
// 		subject:  "Science"
// 	},
// 	"T":{
// 		color: "#536928",
// 		subject:  "Agriculture"
// 	},
// 	"U":{
// 		color: "#B5937C",
// 		subject:  "Military Science"
// 	},
// 	"V":{
// 		color: "#000563",
// 		subject:  "Naval Science"
// 	},
// 	"Z":{
// 		color: "#DBFF00",
// 		subject:  "Library Science & Information Resources"
// 	}
// };

/*
	For reference ----
	This is the kind of structure we want to have with our data

{
	'A' : {
		ClassLetters: d.ClassLetters,
		ClassSubject: d.ClassSubject,
		ClassNumBegin: d.ClassNumBegin,
		ClassNumEnd: d.ClassNumEnd,
		ClassNumDiff: d.ClassNumDiff,
		ClassSubjectFull: d.ClassSubjectFull,

		begin: parseInt(d.ClassNumBegin),
		end: parseInt(d.ClassNumEnd),
		diff: parseInt(d.ClassNumDiff),
		count: 0,
		name: d.ClassSubject,
		sublevels: {
			'AA': {
				ClassLetters: d.ClassLetters,
				ClassSubject: d.ClassSubject,
				ClassNumBegin: d.ClassNumBegin,
				ClassNumEnd: d.ClassNumEnd,
				ClassNumDiff: d.ClassNumDiff,
				ClassSubjectFull: d.ClassSubjectFull,

				begin: parseInt(d.ClassNumBegin),
				end: parseInt(d.ClassNumEnd),
				diff: parseInt(d.ClassNumDiff),
				count: 0,
				name: d.ClassSubject,
				sublevels: {

				}
			}
		}
	}
}
*/

// data structure, this is what the data looks like returned from d3
// {
//   ClassLetters: "TT"
//   ClassNumBegin: "387"
//   ClassNumDiff: "23"
//   ClassNumEnd: "410"
//   ClassSubject: "Soft home furnishings"
//   ClassSubjectFull: "Technology -- Handicrafts. Arts and crafts -- Soft home furnishings"
//   RecordCreated: "3/9/11 20:12"
//   SubjectID: "6321"
// }