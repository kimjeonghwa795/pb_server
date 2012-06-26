/* editor.pb.js
PB stands for PhotoBook
Common code, used by mobile and desktop

window.PB // Generic utilities
window.PB.Book // Book access
window.PB.Photo // Photo objects
*/
"use strict";

// Inserts
(function(jQuery) {
	jQuery.fn.insertAt = function(index, content) {
		var parent = $(this.get(0));
		var children = parent.children();
		if ((children.length - 1) < index)
			$(content).appendTo(parent);
		else
			$(children.get(index)).insertBefore(content);
		return this;
	}
})($);

(function(window) {
	var PB = {
		init: function() {
		},
		clone: function(obj) {
			return JSON.parse(JSON.stringify(obj));
		},
		// $.extend causes cryptic errors when src is a prototype
		extend: function(target, src) {
			for (var p in src)
				target[p] = src[p];
		},
		swapDom: function(a, b) {
			var aparent= a.parentNode;
			var asibling= a.nextSibling===b? a : a.nextSibling;
			b.parentNode.insertBefore(a, b);
			aparent.insertBefore(b, asibling);
		},
		MODEL_CHANGED: 'modelchanged',
		broadcastChange: function(model, propName, options) {
			$('*:data("model.id=' + model.id + '")').trigger(PB.MODEL_CHANGED, [model, propName, options]);
		}
	};

	if (! ('PB' in window)) window.PB = {};

	$.extend(window.PB, PB);

})(window);

// PB.Book
(function(scope) {

	var bookCache = [];

	var Book = function(serverJson) {
		this.originalServerData = serverJson;	// keep original data for diffs
		this.serverData = PB.clone(serverJson); // all data from server are here
		bookCache.push(this);

		// Extend json with helper functions
		for (var i in this.serverData.document.photos) {
			PB.extend(this.serverData.document.photos[i], PB.Photo.prototype);
			// Let photos know what their id is
			Object.defineProperty(this.serverData.document.photos[i], 'id',
				{ value: i });

		}
		for (var i in this.serverData.document.roughPages) {
			PB.extend(this.serverData.document.roughPages[i], PB.RoughPage.prototype);
			// Let pages know what their id is
			Object.defineProperty(this.serverData.document.roughPages[i], 'id',
				{ value: i });
			Object.defineProperty(this.serverData.document.roughPages[i], 'book',
				{ value: this });
		}
	}

	Book.prototype = {
		get id() {
			return this.serverData.id;
		},
		get photoList() {
			return this.serverData.document.photoList;
		},
		photo: function(id) {
			return this.serverData.document.photos[id];
		},
		get roughPageList() {
			return this.serverData.document.roughPageList;
		},
		page: function(id) {
			return this.serverData.document.roughPages[id];
		},
		get title() {
			return this.serverData.document.title || "Untitled";
		}
	}


	Book.get =  function(id) {
		if (id === undefined)
			return bookCache.length > 0 ? bookCache[0] : null;
		else {
			for (var i=0; i<bookCache.length; i++)
				if (bookCache[i].id === id)
					return bookCache[i];
		}
		console.warn("Book.get miss");
		return null;
	}

	scope.Book = Book;
})(window.PB);

// PB.Photo
(function(scope) {
	var Photo = function(props) {
		$.extend(this, props);
	}
	Photo.SMALL = 128;
	Photo.MEDIUM = 1024;
	Photo.LARGE = 2000;
	Photo.prototype = {
		getUrl: function(size) {
			if (size <= Photo.SMALL)
				return ( 's' in this.url ? this.url.s : this.url.l + "?size=icon");
			else if (size <= Photo.MEDIUM)
				return ( 'm' in this.url ? this.url.m : this.url.l + "?size=display");
			else
				return this.url;
		},
		isDraggable: function() {
			return true;
		}
	}

	scope.Photo = Photo;
})(window.PB);

// PB.RoughPage
(function(scope) {
	var RoughPage = function(props) {
		$.extend(this, props);
	}

	var coverRegex = /^cover|^cover-flap|^back-flap|^back/;

	RoughPage.prototype = {
		isDraggable: function() {
			return this.id.match(coverRegex) == null;
		},
		type: function() {
			if ( this.id.match(coverRegex))
				return 'cover';
			else
				return 'pages';
		},
		pageClass: function() {
			if ( this.id.match(coverRegex))
				return this.id;
			else
				return 'page';
		},
		pageTitle: function() {
			switch(this.id) {
				case 'cover': return 'cover';
				case 'cover-flap': return 'flap';
				case 'back-flap': return 'flap';
				case 'back': return 'back';
				default:
					return this.book.roughPageList.indexOf(this.id) - 3;
			}
		},
		photos: function() {
			var list = [];
			for (var i=0; i<this.photoList.length; i++)
				list.push(this.book.photo(this.photoList[i]));
			return list;
		},
		addPhoto: function(photo, options) {
			// options = { animate: false}
			this.photoList.push(photo.id);
			PB.broadcastChange(this, 'photoList', options);
		},
		removePhoto: function(photo, options) {
			var index = this.photoList.indexOf(photo.id);
			if (index == -1) throw "no such photo";
			this.photoList.splice(index, 1);
			PB.broadcastChange(this, 'photoList', options);
		}
	}

	scope.RoughPage = RoughPage;
})(window.PB);
