// editor.gui.tools.js

(function(scope) {
"use strict";
	var buttonMap = [
	{ name: 'photoFilter', value: 'all'},
	{ name: 'photoFilter', value: 'unused'},
	{ name: 'photoSort', value: 'added'},
	{ name: 'photoSort', value: 'taken'},
	{ name: 'photoSort', value: 'name'},
	{ name: 'photoSize', value: 'small'},
	{ name: 'photoSize', value: 'medium'},
	{ name: 'photoSize', value: 'large'},
	{ name: 'pageSize', value: 'small'},
	{ name: 'pageSize', value: 'medium'},
	{ name: 'pageSize', value: 'large'},
	{ name: 'pageSize', value: 'xlarge'}
	];

	var Tools = {
		init: function() {
			for (var i=0; i<buttonMap.length; i++) {
				var btn = this.buttonFromNameVal(buttonMap[i]);
				btn.click(this.buttonMapClick);
			}
			$('#tool-addLocalFile').click( function(ev) {
				ev.preventDefault();
				ev.stopPropagation();
				$('#add-photo-input').click();
				$('#rough-more-tools').hide();
			});
			$('#tool-autoPlace').click( function(ev) {
				ev.preventDefault();
				ev.stopPropagation();
				$('#rough-more-tools').hide();
				window.setTimeout(function() {GUI.Tools.autoPlacePhotos(PB.Book.default)}, 0);
			})
		},
		// click event callback
		buttonMapClick: function(ev) {
			ev.preventDefault();
			ev.stopPropagation();
			var match = this.id.match(/([^-]*)-(.*)/);
			if (!match)
				return console.warn("buttonMapClick could not match id");
			$('#rough-more-tools').hide();
			GUI.Options[ match[1] ] = match[2];
			GUI.Options.toHashbang();
		},
		buttonFromNameVal: function(nameVal) {
			var id = nameVal.name + "-" + nameVal.value;
			var btn = $('#' + id);
			if (btn.length == 0)
				console.error("unknown button ", id);
			return btn;
		},
		loadFromOptions: function() {
			for (var i=0; i< buttonMap.length; i++) {
				var btn = this.buttonFromNameVal( buttonMap[i] );
				if (GUI.Options[ buttonMap[i].name ] == buttonMap[i].value)
					btn.addClass('active');
				else
					btn.removeClass('active');
			}
		},
		autoPlacePhotos: function(book) {
			var t = new PB.Timer("autoPlacePhotos");
			var photos = book.unusedPhotoList;
			photos = PB.ServerPhotoCache.sortPhotos(photos, book);
			var emptyPages = book.pageList.filter(function(pageId) {
				return book.page(pageId).filterAssetIds('photo').length == 0;
			});
			PB.startChangeBatch();
			while (photos.length > 0) {
				var nextPage;
				if (emptyPages.length > 0)
					nextPage = book.page(emptyPages.shift());
				else
					nextPage = book.addPage(-1, {animate:false});
				var want = Math.floor(Math.random() * 4 + 1);
				if (nextPage.kind != 'page') {
					switch(nextPage.kind) {
						case 'cover':
							want = 1;
							break;
						default:
							want = 0;
					}
				}
				while (want > 0 && photos.length > 0) {
					nextPage.addAsset( {
						type: 'photo',
						photoId: photos.shift()
					}, {animate:false});
					want--;
				}
				var lastPage = book.lastPage();
				if (lastPage.isEmpty())
					emptyPages.push( lastPage.id);
			}
			t.print("placed");
			PB.broadcastChangeBatch();
			t.print("broadcast");
			if (nextPage) {
				GUI.Util.revealByScrolling(nextPage, $('#work-area-container'));
			}
		}
	}
	scope.Tools = Tools;
})(GUI);
