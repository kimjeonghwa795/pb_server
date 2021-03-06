// editor.pb.page.editable.js

(function(scope) {
"use strict";

	var PageDroppable = new GUI.Dnd.Droppable({
		flavors: [
			'background', // transferData: backgroundId
			'layout', // transferData: layoutId
			'widget',  // transferData: widgetId
			'design',	// transferData: designId
			'photo',	// transferData: serverPhotoId
			'osFile'	// transferData: fileList
		],
		enter: function($dom, flavor, transferData) {
			this.page = PB.Page.Selection.findClosest($dom).page;
			this.dom = $dom;
			this.dropFlavor = flavor;
			this.page.suspendSave();
			switch( this.dropFlavor ) {
				case 'background':
					this.archive = this.page.archiveSomething( { type: this.dropFlavor});
					this.page.setBackground(transferData);
				break;
				case 'layout':
					this.archive = this.page.archiveSomething( { type: 'layout'});
					this.page.setLayout( transferData);
				break;
				case 'design':
					this.archive = this.page.archiveSomething({ type: 'design'});
					this.page.setDesign( transferData );
				break;
				case 'widget':
				case 'osFile':
					this.dom.addClass('drop-target');
				break;
				case 'photo':
					this.dom.addClass('drop-target-outside');
				break;
			};
		},
		leave: function() {
			switch( this.dropFlavor ) {
				case 'background':
				case 'layout':
				case 'design':
					if ('archive' in this)
						this.page.restoreSomething( this.archive );
				break;
				case 'widget':
				case 'osFile':
					this.dom.removeClass('drop-target');
				break;
				case 'photo':
					this.dom.removeClass('drop-target-outside');
				break;
			}
			this.page.resumeSave();
		},
		putTransferData: function( $ev, flavor, transferData ) {
			this.page.resumeSave();
			switch( this.dropFlavor ) {
				case 'background':
				case 'layout':
				case 'design':
					delete this.archive;
				break;
				case 'widget':
					var loc = GUI.Util.getPageLocation($ev);
					var pageBounds = this.dom[0].getBoundingClientRect();
					var widget = PB.ThemeCache.resource(transferData);
					this.page.addAsset( {
						type: 'widget',
						widgetId: transferData,
						top: loc.y - widget.height() / 2 - (pageBounds.top + $(document).scrollTop()),
						left: loc.x - widget.width() / 2 - (pageBounds.left + $(document).scrollLeft()),
						width: widget.width(),
						height: widget.height()
					});
				break;
				case 'photo':
					var bookPhotoId = this.page.book.bookPhotoId( transferData );
					this.page.addAsset( {
						type: 'photo',
						photoId: bookPhotoId
					});
				break;
				case 'osFile':
					this.page.addOsFileList( transferData );
				break;
			}
		}
	});

	var PhotoDroppable = new GUI.Dnd.Droppable( {
		flavors: [
			'frame', // transferData: frameId
			'photo',  // transferData: serverPhotoId
			'photoInPage' // transferData: { page: , assetId: }
		],

		setTempPhoto: function(asset, serverPhotoId) {
			this.destinationArchive = this.destinationPage.archiveSomething( {
				type: 'asset',
				assetId: this.assetId,
				dependents: true
			});
			var bookPhotoId = this.book.bookPhotoId(serverPhotoId);
			if (bookPhotoId == null)
				bookPhotoId = this.book.addServerPhoto( serverPhotoId );
			this.destinationPage.replacePhotoId( this.assetId, bookPhotoId );
		},
		restoreTempPhoto: function() {
			if ('destinationArchive' in this) {
				this.destinationPage.restoreSomething( this.destinationArchive );
				delete this.destinationArchive;
			}
		},
		replaceSrcPhotoWithDest: function(page, srcId, srcArchive, destArchive) {
			page.updateAsset(srcId, {
				photoId: destArchive.asset.photoId,
				zoom: destArchive.asset.zoom,
				focalPoint: destArchive.asset.focalPoint
			});
			srcArchive.dependents.forEach( function(dep) {
				page.removeAsset(dep.id);
			});
			return page.importAssetDependents(destArchive, srcId);
		},
		setTempPhotoFromPage: function() {
			try {
			this.sourcePage.suspendSave();
			var sourceAsset = this.sourcePage.getAsset( this.sourceAssetId )

			// create archives
			this.destinationArchive = this.destinationPage.archiveSomething( {
				type: 'asset',
				assetId: this.assetId,
				dependents: true
			});
			this.sourceArchive = this.sourcePage.archiveSomething( {
				type: 'asset',
				assetId: this.sourceAssetId,
				dependents: true
			});

			this.destinationImports = this.replaceSrcPhotoWithDest( this.destinationPage,
				this.assetId,
				this.destinationArchive,
				this.sourceArchive);
			this.sourceImports = this.replaceSrcPhotoWithDest( this.sourcePage,
				this.sourceAssetId,
				this.sourceArchive,
				this.destinationArchive );
			}
			catch(ex) {
				console.error(ex);
				debugger;
			}
		},
		restoreTempPhotoFromPage: function() {
			try {
			if ('destinationArchive' in this) {
				var THIS = this;
				this.destinationImports.forEach( function(depId) {
					THIS.destinationPage.removeAsset( depId );
				});
				this.sourceImports.forEach( function( depId) {
					THIS.sourcePage.removeAsset( depId );
				});
				this.destinationPage.restoreSomething( this.destinationArchive );
				this.sourcePage.restoreSomething( this.sourceArchive );
				this.sourcePage.resumeSave();
				delete this.destinationImports;
				delete this.destinationArchive;
				delete this.sourceArchive;
				delete this.sourceImports;
			}
			} catch(ex) {
				console.error(ex);
				debugger;
			}
		},
		enter: function($dom, flavor, transferData, handoff) {
			this.destinationPage = PB.Page.Selection.findClosest($dom).page;
			this.book = this.destinationPage.book;
			this.assetId = $dom.data('model_id');
			this.dom = $dom;
			this.dropFlavor = flavor;
			var asset = this.destinationPage.getAsset( this.assetId );
			switch( this.dropFlavor ) {
				case 'frame':
					this.destinationPage.suspendSave();
					if (handoff)
						$.extend(this, handoff);
					else {
						this.oldFrameId = asset.frameId;
						this.oldFrameData = asset.frameData;
						this.destinationPage.updateAsset( this.assetId, {
							frameId: transferData
						});
					}
				break;
				case 'photo': {
					this.destinationPage.suspendSave();
					if (handoff)
						$.extend(this, handoff);
					else {
						this.setTempPhoto(asset, transferData);
					}
				}
				break;
				case 'photoInPage':
					if (transferData.assetId == this.assetId)
						throw new Error("No dropping image on itself");
					this.destinationPage.suspendSave();
					if (handoff)
						$.extend(this, handoff);
					else {
						this.sourcePage = transferData.page;
						this.sourceAssetId = transferData.assetId;
						this.setTempPhotoFromPage(asset,
							this.sourcePage.getAsset( this.sourceAssetId ).photoId);
					}
				break;
			}
		},
		getHandoff: function() {
			switch(this.dropFlavor) {
				case 'frame':
					return {
						oldFrameId: this.oldFrameId,
						oldFrameData: this.oldFrameData
					}
				case 'photo':
					return {
						destinationArchive: this.destinationArchive
					}
				case 'photoInPage':
					return {
						sourcePage: this.sourcePage,
						sourceAssetId: this.sourceAssetId,
						sourceImports: this.sourceImports,
						sourceArchive: this.sourceArchive,
						destinationArchive: this.destinationArchive,
						destinationImports: this.destinationImports
					}
			}
		},
		leave: function(handoffAssetId) {
			if (handoffAssetId == this.assetId) {
				this.destinationPage.resumeSave();
				if (this.sourcePage) this.sourcePage.resumeSave();
				return this.getHandoff();
			}

			switch( this.dropFlavor ) {
				case 'frame':
				 	if ('oldFrameId' in this) {
						this.destinationPage.updateAsset( this.assetId, {
							frameId: this.oldFrameId,
							frameData: this.oldFrameData
						});
					}
				break;
				case 'photo':
					this.restoreTempPhoto();
				break;
				case 'photoInPage':
					this.restoreTempPhotoFromPage();
				break;

			}
			this.destinationPage.resumeSave();
		},
		putTransferData: function( $ev, flavor, transferData ) {
			switch( this.dropFlavor ) {
				case 'frame':
					this.destinationPage.updateAsset( this.assetId, {
						frameId: transferData
					});
					delete this.oldFrameId;
				break;
				case 'photo':
					this.destinationPage.broadcastPhotosChanged({animate: true});
					delete this.destinationArchive;
				break;
				case 'photoInPage':
					// photo already there, just prevent restore
					var sel = PB.Page.Selection.findClosest(this.dom);
					if (sel)
						this.destinationPage.selectItem(sel, this.assetId)
					delete this.destinationArchive;
					delete this.sourcePage;
					delete this.sourceAssetId;
					delete this.sourceArchive;
				break;
			}
		}
	});

	var DesignDraggableOptions = {
		flavors: ['design'],
		designId: 'your id here',
		getTransferData: function(ev, $src, flavor) {
			return this.designId;
		}
	}

	var BackgroundDraggableOptions = {
		flavors: ['background'],
		backgroundId: 'your background id here',
		getTransferData: function(ev, $src, flavor) {
			return this.backgroundId;
		}
	}

	var LayoutDraggableOptions = {
		flavors: ['layout'],
		layoutId: 'your id here',
		getTransferData: function(ev, $src, flavor) {
			return this.layoutId;
		}
	}

	var PhotoDraggableOptions = {
		flavors: ['photo'],
		photoId: 'your id here',
		getTransferData: function(ev, $src, flavor) {
			return this.photoId;
		}
	}
	var WidgetDraggableOptions = {
		flavors: ['widget'],
		widgetId: 'your id here',
		start: function($el, ev, startLoc) {
			var widget = PB.ThemeCache.resource(this.widgetId);
			var maxDim = 300;
			var width = widget.width();
			var height = widget.height();
			var scale = Math.min( maxDim/width, maxDim/height);
			if (scale < 1) {
				width *= scale;
				height *= scale;
			}
			var $widgetDom = widget.generateDom( width, height, {}, {resolution: PB.PhotoProxy.MEDIUM });
			var $dom = $('<div>').append($widgetDom);
			$dom.addClass('touch-drag-src')
				.css( {
					top: startLoc.y,
					left: startLoc.x,
					marginLeft: -width / 2,
					marginTop: -height / 2,
					background: 'transparent'
				});
			GUI.Dnd.Util.preventDefaultDrag($dom);
			return $dom;
		},
		getTransferData: function(ev, $src, flavor) {
			return this.widgetId;
		}
	}

	var FrameDraggableOptions = {
		flavors: ['frame'],
		frameId: 'your id here',
		getTransferData: function(ev, $src, flavor) {
			return this.frameId;
		}
	}

	var PhotoInPageDraggableOptions = {
		flavors: ['photoInPage'],
		getTransferData: function(ev, $src, flavor) {
			return {
				page: this.page,
				assetId: this.assetId
			};
		},
		start: function($dom, ev, startLoc) {
			this.page = PB.Page.Selection.findClosest($dom).page;
			this.assetId = $dom.data('model_id');
			var asset = this.page.getAsset( this.assetId );
			var photo = this.page.book.photo( asset.photoId );
			var maxSize = 128;
			var d = photo.dimensions;
			var scale = Math.min(1, Math.min( maxSize / d.width, maxSize / d.height));
			d.width *= scale;
			d.height *= scale;
			var $drag = $('<img>')
				.css({
					position: 'absolute',
					top: startLoc.y,
					left: startLoc.x,
					width: d.width,
					height: d.height,
					marginTop: -d.height / 2,
					marginLeft: -d.width /2,
					border: '1px dashed white'
				})
				.prop('src', photo.getUrl(PB.PhotoProxy.SMALL));
			GUI.Dnd.Util.preventDefaultDrag($drag);
			return $drag;
		}
	}


	scope.Page.Editor = {
		Droppable: {
			Page: PageDroppable,
			Photo: PhotoDroppable
		},
		DraggableOptions: {
			Design: DesignDraggableOptions,
			Background: BackgroundDraggableOptions,
			Layout: LayoutDraggableOptions,
			Widget: WidgetDraggableOptions,
			Frame: FrameDraggableOptions,
			Photo: PhotoDraggableOptions,
			PhotoInPage: PhotoInPageDraggableOptions
		}
	}

})(PB);
