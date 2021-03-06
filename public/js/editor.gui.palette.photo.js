// editor.gui.BookPhotoPalette.js

// BookPhotoPalette
// images can be dragged out
(function(scope){
"use strict";

	var PhotoPaletteDraggableOptions = {
		flavors: ['photo'],	// transferData: severPhotoId
		book: 'book',
		getTransferData: function(ev, $src, flavor) {
			var bookPhoto = PB.ModelMap.model( this.bookPhotoId );
			return bookPhoto.serverPhotoId;
		},
		start: function( $el, ev, startLoc ) {
			this.el = $el;
			this.bookPhotoId = $el.data('model_id');
			var bounds = $el[0].getBoundingClientRect();
			var $dom = GUI.Util.cloneDomWithCanvas($el)
				.addClass('touch-drag-src')
				.removeClass('draggable')
				.css( {
					top: startLoc.y + 2,
					left: startLoc.x + 2,
					marginLeft: bounds.left + $(document).scrollLeft() - startLoc.x,
					marginTop: bounds.top + $(document).scrollTop() - startLoc.y,
					position: 'absolute'
				});
			GUI.Dnd.Util.preventDefaultDrag($dom);
			$el.css('opacity', 0);
			return $dom;
		},
		end: function(transferDone) {
			this.el.animate( {opacity: 1.0 }, 500);
		}
	}

	var PhotoPaletteDroppable = new GUI.Dnd.Droppable({
		flavors: [
			'photoInRoughPage',	// transferData: assetId
			'osFile', // transferData: fileList
			'photoInPage'	// transferData: { page: p,  assetId: id }
		],
		enter: function($dom, flavor, transferData) {
			this.dom = $dom;
			this.dom.addClass('drop-target');
		},
		leave: function() {
			this.dom.removeClass('drop-target');
		},
		putTransferData: function($ev, flavor, transferData) {
			switch(flavor) {
			case 'photoInRoughPage':
				var pageAsset = PB.ModelMap.model( transferData );
				pageAsset.page.removeAsset( pageAsset.assetId, { animate: true });
			break;
			case 'osFile':
				var book = PB.ModelMap.domToModel($('#palette-bookphoto'));
				GUI.Dnd.Util.filterFileList( transferData )
					.forEach( function( file ) {
						book.addLocalPhoto(file, { animate:false } );
					});
			break;
			case 'photoInPage':// removes photo from page
				transferData.page.clearPhoto( transferData.assetId );
			break;
			}
		}
	});

	var BookPhotoPalette = {
		bindToBook: function(book) {
			this.makeDroppable();
			// Keep models in sync
			$('#palette-bookphoto')
				.data('model_id', book.id)
				.on(PB.MODEL_CHANGED,
					function(ev, model, prop, options) {
						switch( prop ) {
						case 'photoList':
							BookPhotoPalette.synchronizePhotoList(options);
						break;
						}
					})
				.on('pbShow', function() {
					BookPhotoPalette.processDelayUntilVisible();
				});
			GUI.Options.addListener(this.optionsChanged);
			this.synchronizePhotoList();
		},
		makeDraggable: function($imgDiv)  {
			var model = PB.ModelMap.domToModel( $imgDiv );
			if (!model)
				return;
			$imgDiv.addClass('pb-draggable')
				.data('pb-draggable', new GUI.Dnd.Draggable( PhotoPaletteDraggableOptions ));
			GUI.Dnd.Util.preventDefaultDrag($imgDiv);
		},
		makeDroppable: function() {
			$('#palette-bookphoto-container').addClass('pb-droppable')
				.data('pb-droppable', PhotoPaletteDroppable );
		},
		optionsChanged: function(name, val) {
			switch(name) {
				case 'photoFilter':
					BookPhotoPalette.synchronizePhotoList();
					break;
				case 'photoSize':
					BookPhotoPalette.resizeAllImages();
					break;
				case 'photoSort':
					BookPhotoPalette.synchronizePhotoList();
					$('#palette-bookphoto .photo-div').each(function() {
						BookPhotoPalette.setTileInfo(this, PB.ModelMap.domToModel(this));
					});
					break;
				default:
					break;
			}
		},
		getDomBoxInfo: function() {
			var photoList = $('#palette-bookphoto');
			var domBoxInfo = {
				photoList: {
					top: parseInt(photoList.css('margin-top')),
					bottom: parseInt(photoList.css('margin-bottom'))
				},
				photoDiv: {	top: 2, bottom: 2, height: GUI.Options.photoSizeHeight} // guess
			};
			var photoDiv = $('#palette-bookphoto > .photo-div');
			if (photoDiv.length !== 0)
				domBoxInfo.photoDiv = {
					top: parseInt(photoDiv.css('margin-top')),
					bottom: parseInt(photoDiv.css('margin-bottom')),
					height: GUI.Options.photoSizeHeight
				};
			return domBoxInfo;
		},
		// Have to return margins too
		getPossibleHeights: function(max) {
			$('#palette-bookphoto-container').stop();
			var boxInfo = this.getDomBoxInfo();
			var retVal = {
				top: boxInfo.photoList.top,
				bottom: boxInfo.photoList.bottom,
				heights: [boxInfo.photoDiv.height]
//				heights: [boxInfo.photoDiv.height + boxInfo.photoDiv.top + boxInfo.photoDiv.top * 3]
			};
			var i = 0;
			var photoHeight = boxInfo.photoDiv.height + boxInfo.photoDiv.top;
			while ((retVal.heights[i] + photoHeight) < max)
				retVal.heights.push(retVal.heights[i++] + photoHeight);
			return retVal;
		},
		setTileStatus: function(tile, model) {
			var statusDiv = tile.children('.status');
			var msg = model.status;
			if (msg) {
				if (statusDiv.length === 0) {
					statusDiv = $("<div class='status'>");
					tile.append(statusDiv);
				}
				statusDiv.text(msg);
			}
			else
				statusDiv.remove();
		},
		setTileInfo: function(tile, model) {
			tile = $(tile);
			var infoDiv = tile.children('.info');
			var infoTxt;
			switch(GUI.Options.photoSort) {
				case 'taken':
					var d = model.jsDate;
					if (d)
						infoTxt = d.getFullYear() + "/" + (d.getMonth() + 1) + "/" + d.getDate();
					else
						infoTxt = "n/a";
					break;
				case 'added':
					break;
				case 'name':
					infoTxt = model.display_name;
					break;
				default:
					console.warn("unknown sort type", GUI.Options.photoSort);
					break;
			}
			if (infoTxt) {
				if (infoDiv.length === 0) {
					infoDiv = $("<div class='info'>");
					tile.append(infoDiv);
				}
				infoDiv.text(infoTxt);
			}
			else
				infoDiv.remove();
		},
		setTileProgress: function(tile, model) {
			var progressDiv = tile.children('.progress');
			var percent = model.progress;
			if (percent) {
				if (progressDiv.length === 0) {
					progressDiv = $("<div class='progress'><div class='bar' style='width:0%;'></div></div>");
					tile.append(progressDiv);
				}
				if (percent == -1)
					progressDiv.addClass('progress-striped')
						.addClass('active')
						.children('.bar').css('width', '100%');
				else
					progressDiv.removeClass('progress-striped')
						.removeClass('active')
						.children('.bar').css('width', percent + '%');
			}
			else
				progressDiv.remove();
		},
		setTileFaces: function(tile, model) {
			tile.children('.face').remove();
			var width = tile.children('img').width();
			var height = tile.children('img').height();
			if (!model.faces)
				return;
			for (var i=0; i<model.faces.length; i++) {
				var face = model.faces[i];
				var faceDiv = $(document.createElement('div'))
					.addClass('face')
					.css({
						top: face.top * height,
						left: face.left * width,
						width: (face.right - face.left) * width,
						height: (face.bottom - face.top) * height
					});
				tile.append(faceDiv);
			}
		},
		resizeAllImages: function() {
			$('.photo-div > img').each(function() {
				var el = $(this);
				el.stop();
				var newSize = BookPhotoPalette.scaleTileDimensions({ width: this.naturalWidth, height: this.naturalHeight });
				el.width(newSize.width).height(newSize.height);
			});
		},

		scaleTileDimensions: function(dims) {
			var scaleH = GUI.Options.photoSizeWidth / dims.width;
			var scaleV = GUI.Options.photoSizeHeight / dims.height;
			var scale = Math.min(scaleH, scaleV);
			return {width: dims.width * scale, height: dims.height * scale};
		},
		createImageTile: function(photo) {
			var imgData = photo.getUrlWithDim(128);
			var tile = $("<div class='photo-div'><img src='" + imgData.url + "'></div>");
			var img = $(tile).children('img');
			var scaled = this.scaleTileDimensions(imgData);
			img.width(scaled.width).height(scaled.height);
			tile.data('model_id', photo.id)
				.on(PB.MODEL_CHANGED,
					function(ev, model, prop, options) {
						var img = $(tile).children('img');
						switch(prop) {
							case 'icon_url':
								tile.stop(true, true);
								var imgData = photo.getUrlWithDim(128);
								var scaled = THIS.scaleTileDimensions(imgData);
								img.prop('src', imgData.url).width(scaled.width).height(scaled.height);
							break;
							case 'status':
								BookPhotoPalette.setTileStatus(tile, model);
								break;
							case 'progress':
								BookPhotoPalette.setTileProgress(tile, model);
							break;
							default:
							break;
						}
				});
			var THIS = this;
			this.setTileStatus(tile, photo);
			this.setTileProgress(tile, photo);
			this.setTileInfo(tile, photo);
			this.setTileFaces(tile, photo);
			window.setTimeout(function() {
				// iPad bug workaround. Without timer, touch handlers are not registered
				THIS.makeDraggable(tile);
			}, 0);
			return tile;
		},

		synchronizePhotoList: function(options) {
			if (this.delayUntilVisible($('#palette-bookphoto'), this.synchronizePhotoList))
				return;
			options = $.extend({animate:false}, options);
			var containerDom = $('#palette-bookphoto');
			var bookModel = PB.ModelMap.domToModel(containerDom);
			var sel = '.photo-div';

			var oldChildren = containerDom.children( sel )
				.filter(function() {
					if ($.data(this, 'pb.markedForDelete')) {
						return false;
					}
					return true;
				});

			var oldPhotos = oldChildren.get().map(
				function(el, i) { return $.data(el,'model_id'); });

			var newPhotos = GUI.Options.photoFilter == 'all' ? bookModel.photoList : bookModel.unusedPhotoList;
			newPhotos = PB.ServerPhotoCache.sortPhotos(newPhotos, bookModel);
			var diff = JsonDiff.diff(oldPhotos, newPhotos);
			for (var i=0; i<diff.length; i++) {
				var targetPath = JsonPath.query(oldPhotos, diff[i].path, {just_one: true, ghost_props: true});
				var targetIndex = targetPath.prop();
				var targetId = targetPath.val();
				switch(diff[i].op) {
				case 'set':
					var newPhoto = bookModel.photo(diff[i].args);
					oldChildren = GUI.JQDiffUtil.set(oldChildren,
						targetIndex,
						this.createImageTile(newPhoto));
				break;
				case 'insert':
					var newModel = bookModel.photo(diff[i].args);
					var newDom = this.createImageTile(newModel);
					oldChildren = GUI.JQDiffUtil.insert(oldChildren, containerDom, targetIndex, newDom);
					if (options.animate) {
						GUI.Util.revealByScrolling(newDom, $('#palette-bookphoto-container'));
						var w = newDom.width();
						newDom.css('width', 0)
									.animate({width: w}, {complete: function() {
										$(this).css('width', 'auto');	// because our default width might be wrong

						}});
					}
				break;
				case 'delete':
					var el = $(oldChildren.get(targetIndex));
					oldChildren = GUI.JQDiffUtil.delete(oldChildren, targetIndex, options.animate);
					if (options.animate) {
						el.css('visible', 'hidden')
							.data('pb.markedForDelete', true)
							.animate({width: 0}, function() {
							 	el.remove();
							});
					}
					else
						el.remove();
				break;
				case 'swapArray':
					var src = containerDom.children(sel).get(diff[i].args.srcIndex);
					var dest = containerDom.children(sel).get(diff[i].args.destIndex);
					if (!src || !dest)
						console.warn("synchronizePhotoList swapArray unexpected missing element");
					else
						oldChildren = GUI.JQDiffUtil.swap(oldChildren, src, dest);
				break;
				}
			}
			$('#palette-bookphoto').prepend( $('#palette-bookphoto').find('#palette-kind-picker'));
		}
	}

	$.extend(BookPhotoPalette, GUI.Mixin.DelayUntilVisible);

	scope.Palette.BookPhoto = BookPhotoPalette;
})(window.GUI);
