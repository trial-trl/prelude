window.SEL = (function (SEL) {
    
    var _that;

    SEL.Puzzle = function ( block, requestParams, customData ) {
        this.block = block;
        _that = this;
    };

    SEL.Puzzle.prototype = {
init: function () {
T.load(['https://unpkg.com/konva@6.0.0/konva.min.js', 'https://cdnjs.cloudflare.com/ajax/libs/viewerjs/1.6.1/viewer.min.js'], function () {
    var screenshotViewer, screenshotGallery = document.getElementById('screenshot-ui');
    document.getElementById('screenshot-ui--close').onclick = function () {
      if (!screenshotViewer) return;

      screenshotViewer.hide();
    };

    document.body.appendChild(screenshotGallery);

    var stage = new Konva.Stage({
      container: 'puzzle__canvas',
      width: window.innerWidth,
      height: window.innerHeight,
      draggable: true
    });
    var layer = new Konva.Layer();
    stage.add(layer);
    
    /*
    {
      name: 'piece-',
      type: 'positive',
      x: 0,
      y: 0,
      rotation: 0,
      color: 'red',
    }
    */
    var state = restoreStateData();
    var allPiecesData = {};
    var allPieces = {};
    var selectedPiece, selectedPieceData;
    var allowedAngles = [0, 15, 30, 45, 60, 75, 90, 105, 120, 135, 150, 165, 180, 195, 210, 225, 240, 255, 270, 285, 300, 315, 330, 345, 360];

    var transformer = new Konva.Transformer({
      resizeEnabled: false,
      borderEnabled: false,
      rotationSnaps: allowedAngles,
      rotationSnapTolerance: 10,
      anchorSize: 30,
      borderDash: [3, 3],
      centeredScaling: true
    });

    var deletePiece, flipVertically, flipHorizontally;

    var iconDeleteLoader = new Image();
    iconDeleteLoader.onload = function (e) {
      deletePiece = new Konva.Image({
        image: iconDeleteLoader,
        width: 35,
        height: 35
      });
      deletePiece.on('click tap', function () {
        enterPuzzleContext();
        deselectPiece(true);
      });
      deletePiece.on('mouseover', transformActionOver);
      deletePiece.on('mouseout', transformActionOut);
      if (!deletePiece.isCached()) {
        deletePiece.cache();
      }
      adaptImageToTheme(deletePiece);
      transformer.add(deletePiece);
    };
    iconDeleteLoader.src = 'img/delete.png';

    var iconFlipLoader = new Image();
    iconFlipLoader.onload = function (e) {
      flipVertically = new Konva.Image({
        image: iconFlipLoader,
        rotation: 90,
        width: 35,
        height: 35
      });
      flipVertically.on('click tap', function () {
        enterPuzzleContext();
        pieceResetOffsetIfNeeded(selectedPiece, function (piece) {
          piece.scaleY(piece.scaleY() * -1);
        });
      });
      flipVertically.on('mouseover', transformActionOver);
      flipVertically.on('mouseout', transformActionOut);

      flipHorizontally = new Konva.Image({
        image: iconFlipLoader,
        width: 35,
        height: 35
      });
      flipHorizontally.on('click tap', function () {
        enterPuzzleContext();
        pieceResetOffsetIfNeeded(selectedPiece, function (piece) {
          piece.scaleX(piece.scaleX() * -1);
        });
      });
      flipHorizontally.on('mouseover', transformActionOver);
      flipHorizontally.on('mouseout', transformActionOut);

      if (!flipVertically.isCached()) {
        flipVertically.cache();
      }
      if (!flipHorizontally.isCached()) {
        flipHorizontally.cache();
      }

      adaptImageToTheme(flipVertically);
      adaptImageToTheme(flipHorizontally);

      transformer.add(flipVertically);
      transformer.add(flipHorizontally);
    };
    iconFlipLoader.src = 'img/flip.png';

    var rotater = transformer.findOne('.rotater');
    rotater.fillPatternScale({x: .85, y: .85});
    rotater.strokeEnabled(false);
    rotater.fillPriority('pattern');

    var iconRotateLoader = new Image();
    iconRotateLoader.onload = function (e) {
      rotater.width(35);
      rotater.height(35);
      rotater.fillPatternRepeat('no-repeat');
      rotater.fillPatternImage(iconRotateLoader);
      if (!rotater.isCached()) {
        rotater.cache();
      }
      adaptImageToTheme(rotater);
    };
    iconRotateLoader.src = 'img/rotate.png';

    layer.add(transformer);

    function findPieceData(pieceObj) {
      var i = +(pieceObj.name().split('-')[1]);
      if (allPiecesData[i]) {
        return allPiecesData[i];
      }
    }

    stage.on('click tap', function (e) {
      if (e.target === stage || selectedPiece === e.target) {
        deselectPiece();
        layer.batchDraw();
        return;
      }

      if (!isPiece(e.target)) return;

      if (selectedPiece) {
        deselectPiece();
      }

      selectedPiece = e.target;
      selectedPieceData = findPieceData(selectedPiece);
      ui.notifyPieceSelected();
      pieceStopDefaultAnimation(selectedPiece);
      selectedPiece.moveToTop();
      transformer.moveToTop();
      transformer.nodes([e.target]);
      _anchorButtons();
      selectedPiece.on('transformstart', function () {
        pieceStrokeRemove(selectedPiece);
      });
      selectedPiece.on('transformend', function () {
        pieceStrokeAdd(selectedPiece);
        updateStateData(selectedPiece, {
          position: {
            x: selectedPiece.x(),
            y: selectedPiece.y()
          },
          rotation: selectedPiece.rotation()
        });
      });
      selectedPiece.on('transform', _anchorButtons);

      enterPuzzleContext();

      layer.batchDraw();

      function _anchorButtons() {
        enterPuzzleContext();
        moveButtonToAnchor(deletePiece, 'top-right');
        moveButtonToAnchor(flipHorizontally, 'bottom-center');
        moveButtonToAnchor(flipVertically, 'middle-left');
      }
    });

    var isInPuzzleContext = false,
        keepPuzzleContextForMs = 3000,
        puzzleContextTimeout,
        context = {
          toggleClass: 'in-puzzle',
          pageTitleElement: SEL.Page.Title.element,
          titleMain: SEL.Page.Title.element.textContent,
          titleInPuzzle: document.getElementById('home__s1-phrase').textContent
        };

    stage.on('mouseover', function (e) {
      document.documentElement.classList.add('puzzle-interaction--grab');
    });

    stage.on('mouseout', function (e) {
      document.documentElement.classList.remove('puzzle-interaction--grab');
    });

    stage.on('dragstart', function (e) {
      document.documentElement.classList.add('puzzle-interaction--grabbing');
      enterPuzzleContext();
      pieceStrokeRemove(selectedPiece, false);
      pieceRemoveDefaultAnimation(selectedPiece);
      transformer.nodes([]);
      layer.batchDraw();
    });

    stage.on('dragmove', enterPuzzleContext);

    stage.on('dragend', function (e) {
      document.documentElement.classList.remove('puzzle-interaction--grabbing');
      enterPuzzleContext();
      if (!selectedPiece) return;
      pieceStrokeAdd(selectedPiece, false);
      transformer.nodes([selectedPiece]);
      layer.batchDraw();
      updateStateData(selectedPiece, {
        position: {
          x: selectedPiece.x(),
          y: selectedPiece.y()
        },
        rotation: selectedPiece.rotation()
      });
    });

    window.addEventListener('resize', function (e) {
      stage.size({
        width: window.innerWidth,
        height: window.innerHeight
      });
      stage.batchDraw();
    });

    var defaultPieces = {
      1: {name: 'piece-1', type: 'positive', position: {x: toResponsiveX(35), y: toResponsiveY(75)}, rotation: allowedAngles[(allowedAngles.length - 1) / 2], addAnimation: false},
      2: {name: 'piece-2', type: 'negative_1', position: {x: toResponsiveX(random(40, 100)), y: toResponsiveY(random(0, 100))}, rotation: 0, addAnimation: true},
      3: {name: 'piece-3', type: 'negative_2', position: {x: toResponsiveX(random(40, 100)), y: toResponsiveY(random(0, 100))}, rotation: 0, addAnimation: true},
      4: {name: 'piece-4', type: 'negative_1', position: {x: toResponsiveX(random(40, 100)), y: toResponsiveY(random(0, 100))}, rotation: 0, addAnimation: true},
      5: {name: 'piece-5', type: 'negative_2', position: {x: toResponsiveX(random(40, 100)), y: toResponsiveY(random(0, 100))}, rotation: 0, addAnimation: true},
      6: {name: 'piece-6', type: 'positive', position: {x: toResponsiveX(random(40, 100)), y: toResponsiveY(random(0, 100))}, rotation: 0, addAnimation: true},
      7: {name: 'piece-7', type: 'positive', position: {x: toResponsiveX(random(40, 100)), y: toResponsiveY(random(0, 100))}, rotation: 0, addAnimation: true},
      8: {name: 'piece-8', type: 'positive', position: {x: toResponsiveX(random(40, 100)), y: toResponsiveY(random(0, 100))}, rotation: 0, addAnimation: true}
    };

    for (var i in state) {
      var data = state[i];
      if (!data) continue;
      addPuzzlePiece(data, i, false);
    }

    if (Object.keys(defaultPieces).length - Object.keys(state).length > 0) {
      for (var i in defaultPieces) {    
        var data = defaultPieces[i];
        if (state[i]) continue;
        addPuzzlePiece(data, i, data.addAnimation);
      }
    }

    function addPuzzlePiece(data, index, addAnimation) {
      if (data.type !== 'positive' && data.type !== 'negative_1' && data.type !== 'negative_2') {
        throw new TypeError("filename must be either 'positive', 'negative_1' or 'negative_2'");
      }

      var realPiecesData = [];
      for (var i in allPieces) {
        realPiecesData[i] = allPieces[i];
      };
      index = index || realPiecesData.length;
      var safetyMargin = 100;
      var data = {
        name: 'piece-' + index,
        type: data.type,
        position: {
          x: (data.position && data.position.x) || random(safetyMargin, window.innerWidth - safetyMargin),
          y: (data.position && data.position.y) || random(safetyMargin, window.innerHeight - safetyMargin),
        },
        offset: {
          x: (data.offset && data.offset.x) || 0,
          y: (data.offset && data.offset.y) || 0,
        },
        scale: {
          x: (data.scale && data.scale.x) || 1,
          y: (data.scale && data.scale.y) || 1
        },
        rotation: data.rotation || random(allowedAngles)
      };

      var piece = new Konva.Path({
        draggable: true,
        x: data.position.x,
        y: data.position.y,
        offset: data.offset,
        scale: data.scale,
        rotation: data.rotation,
        name: data.name
      });

      if (data.type === 'positive') {
        var coords = { 
          x: (-.06576 * 1569.8) + (-2.20078 * -1359.3) + (-2878.4),
          y: (2.8649 * 1569.8) + (-.05047 * -1359.3) + (-4476.1)
        };
        data.color = data.color || 'green';
        piece.setAttrs({
          data: 'm 7.7737893,55.380952 c -1.3110758,0.75695 -2.6005649,1.520489 -3.8917664,2.283863 L 14.871022,76.698321 c -3.459251,1.9972 -7.0351744,3.985319 -10.3900906,6.045834 -4.40803016,3.025668 -5.819623,8.977117 -3.100923,13.686044 2.7184999,4.708581 8.5783977,6.461821 13.4029226,4.157541 0.243766,-0.1166 0.487499,-0.23434 0.725492,-0.37175 l 9.704681,-5.602999 10.667999,18.477519 c 1.287268,-0.76099 2.580293,-1.5216 3.893967,-2.28005 79.04042,-45.634006 135.42231,-51.961703 173.97883,-43.839842 28.90381,6.088853 49.45033,20.538474 63.35482,36.791762 l 14.34855,-14.347592 c 2.82439,2.8244 5.67093,5.763954 8.52934,8.471261 4.06345,3.474701 10.17707,3.297211 14.02184,-0.54747 3.84459,-3.844566 4.02152,-9.958318 0.54677,-14.021967 -0.17579,-0.205268 -0.35162,-0.410623 -0.54579,-0.605012 L 306.08442,74.787475 322.36935,58.50381 C 300.05557,34.055209 268.28798,13.052122 226.95464,4.3406792 169.36307,-7.790851 96.149615,4.3597426 7.780379,55.379745 Z',
          fillRadialGradientStartPoint: coords,
          fillRadialGradientStartRadius: 0,
          fillRadialGradientEndPoint: coords,
          fillRadialGradientEndRadius: 134.6 + 140,
          fillRadialGradientColorStops: getPieceColorStops(data.color)
        });
      } else if (data.type === 'negative_1') {
        var coords = { 
          x: (2.26019 * 1154.5) + (.24315 * -1288.9) + (-2258.5),
          y: (-.17056 * 1154.5) + (3.22205 * -1288.9) + (4437.4)
        };
        data.color = data.color || 'red';
        piece.setAttrs({
          data: 'M 332.79779,39.464752 C 221.51348,-19.125165 126.89153,-3.8551448 64.365324,29.723425 37.597381,44.094861 16.081802,61.544934 -0.00453195,77.141284 l 6.72631495,6.72608 c 5.615468,-5.22047 13.532552,-7.21887 20.975293,-5.22427 7.706215,2.06484 13.726268,8.08341 15.791684,15.79 1.994339,7.442696 -0.0056,15.360066 -5.226017,20.975126 l 6.904806,6.90372 C 57.432313,110.53675 73.953273,97.223614 94.638213,86.118244 141.97874,60.692044 207.26191,45.85828 300.78808,94.896204 l 4.8407,-8.38434 c -6.496,-4.07301 -10.47408,-11.20237 -10.47462,-18.90743 2e-5,-7.97804 4.25642,-15.35034 11.1655,-19.339209 6.67295,-3.852688 14.83663,-3.971804 21.61162,-0.382425 l 4.86015,-8.418027 z',
          fillRadialGradientStartPoint: coords,
          fillRadialGradientStartRadius: 0,
          fillRadialGradientEndPoint: coords,
          fillRadialGradientEndRadius: 122.1 + 140,
          fillRadialGradientColorStops: getPieceColorStops(data.color)
        });
      } else if (data.type === 'negative_2') {
        var coords = { 
          x: (-.46054 * 1395.5) + (-2.39879 * -1084.9) + (-1935),
          y: (4.05109 * 1395.5) + (-.27266 * -1084.9) + (-5920.7)
        };
        data.color = data.color || 'blue';
        piece.setAttrs({
          data: 'm 330.59499,70.774061 -8.74811,-5.05022 c -4.07308,6.4959 -11.20081,10.47484 -18.90641,10.47529 -7.97807,7e-5 -15.35107,-4.25558 -19.34071,-11.16529 -3.85267,-6.67289 -3.97154,-14.8375 -0.38255,-21.612717 l -8.60938,-4.969477 c -1.84026,2.137351 -3.71895,4.166698 -5.62439,6.072134 -9.21785,9.21785 -46.41237,22.894 -89.59609,19.24886 C 136.20435,60.128211 88.100584,42.485191 51.191024,5.57563 49.25638,3.640985 47.290765,1.789214 45.304735,0 l -6.649349,6.64935 c 5.220555,5.615432 7.217934,13.531408 5.224105,20.974202 -2.064892,7.706191 -8.084351,13.72565 -15.7904,15.790401 -7.442582,1.994178 -15.359066,-0.0035 -20.9742014,-5.224105 l -7.12480802,7.124803 c 1.94978302,1.67485 3.92719302,3.5038 5.94266002,5.51926 C 55.142424,100.0436 117.65066,122.79405 174.00353,127.54935 c 56.35429,4.75671 107.62306,-5.15339 140.23836,-37.768689 5.68472,-5.68472 11.18941,-12.04046 16.35404,-19.00696 z',
          fillRadialGradientStartPoint: coords,
          fillRadialGradientStartRadius: 0,
          fillRadialGradientEndPoint: coords,
          fillRadialGradientEndRadius: 115 + 140,
          fillRadialGradientColorStops: getPieceColorStops(data.color)
        });
      }

      layer.add(piece);
      piece.on('mouseover dragend', function () {
        if (transformer.isTransforming()) return;
        pieceStrokeAdd(this);
      });
      piece.on('dragstart dragend', function () {
        pieceRemoveDefaultAnimation(this);
      });
      piece.on('dragend', function () {
        updateStateData(this, {
          position: {
            x: this.x(),
            y: this.y()
          },
          rotation: this.rotation()
        });
      });
      piece.on('dragmove mouseout', function (e) {
        if (selectedPiece === e.target) return;
        pieceStrokeRemove(this);
      });

      if (typeof addAnimation === 'boolean' ? addAnimation : true) {
        pieceCreateDefaultAnimation(piece);
      }

      allPieces[index] = piece;
      allPiecesData[index] = data;
      
      layer.batchDraw();
    }

    function getPieceColorStops(color) {
      if (color === 'red') {
        return [0, SEL.Page.Theme.themed('primary1Stop0'), 1, SEL.Page.Theme.themed('primary1Stop1')];
      } else if (color === 'green') {
        return [0, SEL.Page.Theme.themed('primary2Stop0'), 1, SEL.Page.Theme.themed('primary2Stop1')];
      } else if (color === 'blue') {
        return [0, SEL.Page.Theme.themed('primary3Stop0'), 1, SEL.Page.Theme.themed('primary3Stop1')];
      }
    }

    function pieceResetOffsetIfNeeded(piece, fn) {
      if (!isPiece(piece) || typeof fn !== 'function') return;
      
      var oldOffset  = piece.offset();
      var resetOffset = oldOffset.x === 0 || oldOffset.y === 0;
      if (resetOffset) {
        var size = transformer.findOne('.bottom-right').position();
        piece.offsetX(size.x / 2);
        piece.offsetY(size.y / 2);
      }

      fn(piece);

      if (resetOffset) {
        var oldPosStart = piece.position();
        piece.position({
          x: oldPosStart.x + (size.x / 2),
          y: oldPosStart.y + (size.y / 2),
        });
      }

      layer.batchDraw();

      updateStateData(piece, {
        position: {
          x: piece.x(),
          y: piece.y()
        },
        scale: {
          x: piece.scaleX(),
          y: piece.scaleY()
        },
        offset: {
          x: piece.offsetX(),
          y: piece.offsetY()
        }
      });
    }

    function pieceStrokeAdd(piece, update) {
      if (!isPiece(piece)) return;

      piece.stroke(SEL.Page.Theme.themed('backgroundInvert'));
      piece.strokeWidth(10);

      if (typeof update === 'boolean' ? update : true) {
        layer.batchDraw();
      }
    }

    function pieceStrokeRemove(piece, update) {
      if (!isPiece(piece)) return;

      piece.stroke();
      piece.strokeWidth(0);

      if (typeof update === 'boolean' ? update : true) {
        layer.batchDraw();
      }
    }

    function isPiece(obj) {
      return obj.name().indexOf('piece') !== -1;
    }

    function pieceCreateDefaultAnimation(piece) {
      if (!isPiece(piece)) return;
      if (!piece.anim) {
        (function (piece) {
          var duration = 5000,
              toX, toY, durationX, durationY,
              interval = setInterval(sortValues, duration);

          sortValues();

          piece.anim = new Konva.Animation(function (frame) {
            var timeFunction = (frame.time * 2 * Math.PI);
            piece.x(piece.x() + toX * Math.sin(timeFunction / durationX));
            piece.y(piece.y() + toY * Math.sin(timeFunction / durationY));
          }, layer);

          function sortValues() {
            toX = (Math.random() - .5) * 2;
            toY = (Math.random() - .5) * 2;
            durationX = random(1000, 5000) + +((Math.random() - .5) * 25);
            durationY = random(1000, 5000) + +((Math.random() - .5) * 25);
          }
        })(piece);
      }
      pieceStartDefaultAnimation(piece);
    }

    function pieceRemoveDefaultAnimation(piece) {
      if (!isPiece(piece) || !piece.anim) return;

      pieceStopDefaultAnimation(piece);
      delete piece.anim;
    }

    function pieceStartDefaultAnimation(piece) {
      if (!isPiece(piece) || !piece.anim) return;

      piece.anim.start();
    }

    function pieceStopDefaultAnimation(piece) {
      if (!isPiece(piece) || !piece.anim) return;

      piece.anim.stop();
    }
    
    function deselectPiece(destroy) {
      ui.notifyPieceUnselected();
      pieceStrokeRemove(selectedPiece, false);
      pieceStartDefaultAnimation(selectedPiece);
      selectedPiece.off('transform');
      selectedPiece.off('transformstart');
      selectedPiece.off('transformend');
      transformer.nodes([]);
      if (destroy === true) {
        selectedPiece.destroy();
      }
      selectedPieceData = null;
      selectedPiece = null;
    }

    function transformActionOver() {
      document.documentElement.classList.add('puzzle-interaction--transform-action');
    }
    function transformActionOut() {
      document.documentElement.classList.remove('puzzle-interaction--transform-action');
    }

    function enterPuzzleContext() {
      if (isInPuzzleContext) {
        clearTimeout(puzzleContextTimeout);
        puzzleContextTimeout = setTimeout(leavePuzzleContext, keepPuzzleContextForMs);
        return;
      }
      
      setTimeout(function () {
        context.pageTitleElement.innerHTML = context.titleInPuzzle;
      }, 1 * 1000);
      puzzleContextTimeout = setTimeout(leavePuzzleContext, keepPuzzleContextForMs);
      document.documentElement.classList.add(context.toggleClass);
      isInPuzzleContext = true;
    }

    function leavePuzzleContext() {
      if (!isInPuzzleContext) return;

      puzzleContextTimeout = null;
      context.pageTitleElement.innerHTML = context.titleMain;
      document.documentElement.classList.remove(context.toggleClass);
      isInPuzzleContext = false;
    }
    
    function moveButtonToAnchor(btn, anchor) {
      var pos = transformer.findOne('.' + anchor).position();
      if (anchor === 'bottom-center') {
        btn.position({
          x: pos.x - btn.width() / 2,
          y: pos.y + btn.height() / 2
        });
      }
      if (anchor === 'middle-left') {
        btn.position({
          x: pos.x - btn.width() / 2,
          y: pos.y - btn.height() / 2
        });
      }
      if (anchor === 'top-right') {
        btn.position(pos);
      }
    }

    function addToStateData(data) {
      state[+(data.name.split('-')[1])] = data;
    }

    function updateStateData(pieceObj, dataToChange) {
      var i = +(pieceObj.name().split('-')[1]);
      if (state[i]) {
        Object.assign(state[i], dataToChange);
        saveStateData();
        return;
      }

      var data = findPieceData(pieceObj);
      Object.assign(data, dataToChange);
      addToStateData(data);
      saveStateData();
    }

    function saveStateData() {
      localStorage.setItem('user-puzzle', JSON.stringify(state));
    }

    function restoreStateData() {
      return localStorage.getItem('user-puzzle') 
            ? JSON.parse(localStorage.getItem('user-puzzle'))
            : {};
    }

    function screenshot() {
      var img = new Image();
      img.src = stage.toDataURL();
      img.style.border = '1px solid';
      screenshotViewer = new Viewer(img, {
        navbar: false,
        toolbar: false,
        title: false,
        button: false,
        viewed: function () {
          screenshotGallery.hidden = false;
          screenshotViewer.zoomTo(.75);
        },
        hide: function () {
          screenshotGallery.hidden = true;
        },
        hidden: function () {
          screenshotViewer.destroy();
        }
      });
      screenshotViewer.show();
    }

    window.addEventListener('themechange', function () {
      for (var i in allPiecesData) {
        colorSelected(allPieces[i], allPiecesData[i].color);
      }
      layer.batchDraw();
      
      _applyFilterToTransformerAnchors();

      function _applyFilterToTransformerAnchors() {
        if (!flipVertically || !flipHorizontally || !deletePiece || !rotater || !flipVertically.isCached() || !flipHorizontally.isCached() || !deletePiece.isCached() || !rotater.isCached()) {
          return setTimeout(_applyFilterToTransformerAnchors, 1000);
        }

        adaptImageToTheme(flipVertically);
        adaptImageToTheme(flipHorizontally);
        adaptImageToTheme(deletePiece);
        adaptImageToTheme(rotater);

        layer.batchDraw();
      }
    });

    function adaptImageToTheme(imageObj) {
      imageObj.filters(SEL.Page.Theme.current[1] === 'dark' ? [Konva.Filters.Invert] : []);
    }

    function colorSelected(pieceObj, color) {
      if (!isPiece(pieceObj) || (color !== 'red' && color !== 'green' && color !== 'blue')) return;
      pieceObj.setAttrs({
        fillRadialGradientColorStops: getPieceColorStops(color)
      });
      layer.batchDraw();
      updateStateData(pieceObj, {color: color});
    }

    var initUI = (function () {
      
      var takeScreenshot = document.getElementById('puzzle-ui--take-screenshot');
      var group_pickColor = document.getElementById('puzzle-ui--change-color-group');
      var pickColor = document.getElementById('puzzle-ui--change-color');
      var pickColor_iconOpen = pickColor.children[0];
      var pickColor_iconClose = pickColor.children[1];
      var group_colorsAvailable = document.getElementById('puzzle-ui--change-color__colors');
      var changeColorToRed = document.getElementById('puzzle-ui--change-color__red');
      var changeColorToGreen = document.getElementById('puzzle-ui--change-color__green');
      var changeColorToBlue = document.getElementById('puzzle-ui--change-color__blue');
      var spawnPositive = document.getElementById('puzzle-ui--spawn-positive');
      var spawnNegative = document.getElementById('puzzle-ui--spawn-negative');

      takeScreenshot.onclick = function () {
        screenshot();
      };

      pickColor.onclick = function () {
        group_colorsAvailable.hidden = !group_colorsAvailable.hidden;
        pickColor_iconOpen.hidden = !group_colorsAvailable.hidden;
        pickColor_iconClose.hidden = group_colorsAvailable.hidden;
      };
      
      changeColorToRed.onclick = function () {
        colorSelected(selectedPiece, 'red');
        pickColor.click();
      };
      changeColorToGreen.onclick = function () {
        colorSelected(selectedPiece, 'green');
        pickColor.click();
      };
      changeColorToBlue.onclick = function () {
        colorSelected(selectedPiece, 'blue');
        pickColor.click();
      };

      spawnPositive.onclick = function () {
        addPuzzlePiece('positive');
      };
      spawnNegative.onclick = function () {
        addPuzzlePiece('negative_' + Math.round(random(1, 2)));
      };

      function notifyPieceSelected() {
        group_pickColor.hidden = false;
      }

      function notifyPieceUnselected() {
        group_pickColor.hidden = true;
      }

      return {
        notifyPieceSelected: notifyPieceSelected,
        notifyPieceUnselected: notifyPieceUnselected
      };

    });

    var ui = initUI();

});
}
    };

    return SEL;
    
})(window.SEL || {});