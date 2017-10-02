		// helper functions
		// from https://davidwalsh.name/vendor-prefix
		var prefix = (function () {
			var styles = window.getComputedStyle(document.documentElement, ''),
				pre = (Array.prototype.slice.call(styles).join('').match(/-(moz|webkit|ms)-/) || (styles.OLink === '' && ['', 'o']))[1],
				dom = ('WebKit|Moz|MS|O').match(new RegExp('(' + pre + ')', 'i'))[1];
			
			return {
				dom: dom,
				lowercase: pre,
				css: '-' + pre + '-',
				js: pre[0].toUpperCase() + pre.substr(1)
			};
		})();
		
		// vars & stuff
		const support = {transitions : Modernizr.csstransitions},
			transEndEventNames = {'WebkitTransition': 'webkitTransitionEnd', 'MozTransition': 'transitionend', 'OTransition': 'oTransitionEnd', 'msTransition': 'MSTransitionEnd', 'transition': 'transitionend'},
			transEndEventName = transEndEventNames[Modernizr.prefixed('transition')],
			onEndTransition = function(el, callback, propTest) {
				var onEndCallbackFn = function( ev ) {
					if( support.transitions ) {
						if( ev.target != this || propTest && ev.propertyName !== propTest && ev.propertyName !== prefix.css + propTest ) return;
						this.removeEventListener( transEndEventName, onEndCallbackFn );
					}
					if( callback && typeof callback === 'function' ) { callback.call(this); }
				};
				if( support.transitions ) {
					el.addEventListener( transEndEventName, onEndCallbackFn );
				}
				else {
					onEndCallbackFn();
				}
			},
			// the indoor element
			indoor = document.querySelector('.indoor'),
			// indoor´s levels wrapper
			indoorLevelsEl = indoor.querySelector('.levels'),
			// indoor´s levels
			indoorLevels = [].slice.call(indoorLevelsEl.querySelectorAll('.level')),
			// total levels
			indoorLevelsTotal = indoorLevels.length,
			// surroundings elems
			indoorSurroundings = [].slice.call(indoor.querySelectorAll('.surroundings'));
			// selected level position
			let selectedLevel;
			// navigation element wrapper
			const indoornav = document.querySelector('.indoornav'),
			// show all indoor´s levels ctrl
			allLevelsCtrl = document.querySelector('.azavea-header > .header'),
			// pins
			pins = [].slice.call(indoorLevelsEl.querySelectorAll('.pin')),
			// content element
			contentEl = document.querySelector('.content'),
			// content close ctrl
			contentCloseCtrl = contentEl.querySelector('button.content__button');
			// check if a content item is opened
			let isOpenContentArea,
			// check if currently animating/navigating
			isNavigating,
			// check if all levels are shown or if one level is shown (expanded)
			isExpanded;
			// spaces list element
			const spacesListEl = document.getElementById('spaces-list'),
			// spaces list ul
			spacesEl = spacesListEl.querySelector('ul.list'),
			// all the spaces listed
			spaces = [].slice.call(spacesEl.querySelectorAll('.list__item > a.list__link'));
			// reference to the current shows space (name set in the data-name attr of both the listed spaces and the pins on the map)
			let spaceref;
			// sort by ctrls
			const sortByNameCtrl = document.querySelector('#sort-by-name'),
			// listjs initiliazation (all indoor´s spaces)
			spacesList = new List('spaces-list', { valueNames: ['list__link', { data: ['level'] }, { data: ['category'] } ]} ),
	
			// smaller screens:
			// open search ctrl
			openSearchCtrl = document.querySelector('button.open-search'),
			// main container
			containerEl = document.querySelector('.container'),
			// close search ctrl
			closeSearchCtrl = spacesListEl.querySelector('button.close-search');
	
		function init() {
			// init/bind events
			initEvents();
		}
	
		/**
		 * Initialize/Bind events fn.
		 */
		function initEvents() {
			// click on a Mall´s level
			indoorLevels.forEach(function(level, pos) {
				$(level).on('click', () => {
					// shows this level
					showLevel(pos+1);
				});
			});
	
			// click on the show indoor´s levels ctrl
			allLevelsCtrl.addEventListener('click', function() {
				// shows all levels
				showAllLevels();
			});
	
			// sort by name ctrl - add/remove category name (css pseudo element) from list and sorts the spaces by name 
			sortByNameCtrl.addEventListener('click', function() {
				if( this.checked ) {
					$(spacesEl).removeClass('grouped-by-category');
					spacesList.sort('list__link');
				}
				else {
					$(spacesEl).addClass('grouped-by-category'); 
					spacesList.sort('category');
				}
			});
	
			// hovering a pin / clicking a pin
			pins.forEach(function(pin) {
				console.log(pin, 'pin')
				var contentItem = contentEl.querySelector('.content__item[data-space="' + pin.getAttribute('data-space') + '"]');
	
				pin.addEventListener('mouseenter', function() {
					console.log(contentItem, 'mouseenter')
					if( !isOpenContentArea ) {
						$(contentItem).addClass('content__item--hover');
					}
				});
				pin.addEventListener('mouseleave', function() {
					if( !isOpenContentArea ) {
						$(contentItem).removeClass('content__item--hover');
					}
				});
				pin.addEventListener('click', function(ev) {
					ev.preventDefault();
					// open content for this pin
					console.log(contentItem, 'contentitem', pin.getAttribute('data-space'), 'open content begins')
					openContent(pin.getAttribute('data-space'));
					// remove hover class (showing the title)
					$(contentItem).removeClass('content__item--hover');
				});
			});
	
			// closing the content area
			contentCloseCtrl.addEventListener('click', function() {
				closeContentArea();
			});
	
			// clicking on a listed space: open level - shows space
			spaces.forEach(function(space) {
				var spaceItem = space.parentNode,
					level = spaceItem.getAttribute('data-level'),
					spacerefval = spaceItem.getAttribute('data-space');
	
				space.addEventListener('click', function(ev) {
					ev.preventDefault();
					// for smaller screens: close search bar
					closeSearch();
					// open level
					showLevel(level);
					// open content for this space
					openContent(spacerefval);
				});
			});
	
			// smaller screens: open the search bar
			openSearchCtrl.addEventListener('click', function() {
				openSearch();
			});
	
			// smaller screens: close the search bar
			closeSearchCtrl.addEventListener('click', function() {
				closeSearch();
			});
		}
	
		/**
		 * Opens a level. The current level moves to the center while the other ones move away.
		 */
		function showLevel(level) {
			if( isExpanded ) {
				return false;
			}
			
			// update selected level val
			selectedLevel = level;
	
			$(indoorLevelsEl).addClass(`levels--selected-${selectedLevel}`);
			
			// the level element
			var levelEl = indoorLevels[selectedLevel - 1];
			$(levelEl).addClass('level--current');
	
			onEndTransition(levelEl, function() {
				$(indoorLevelsEl).addClass('levels--open');
	
				// show level pins
				showPins();
	
				isExpanded = true;
			}, 'transform');
			
			// hide surroundings element
			hideSurroundings();
			
			// show indoor nav ctrls
			showindoornav();
	
			// filter the spaces for this level
			showLevelSpaces();
		}
	
		/**
		 * Shows all Mall´s levels
		 */
		function showAllLevels() {
			if( isNavigating || !isExpanded ) {
				return false;
			}
			isExpanded = false;
	
			$(indoorLevels[selectedLevel - 1]).removeClass('level--current');
			$(indoorLevelsEl).removeClass('levels--selected-' + selectedLevel);
			$(indoorLevelsEl).removeClass('levels--open');
	
			// hide level pins
			removePins();
	
			// shows surrounding element
			showSurroundings();
			
			// hide indoor nav ctrls
			hideindoornav();
	
			// show back the complete list of spaces
			spacesList.filter();
	
			// close content area if it is open
			if( isOpenContentArea ) {
				closeContentArea();
			}
		}
	
		/**
		 * Shows all spaces for current level
		 */
		function showLevelSpaces() {
			spacesList.filter(function(item) { 
				return item.values().level === selectedLevel.toString(); 
			});
		}
	
		/**
		 * Shows the level´s pins
		 */
		function showPins(levelEl) {
			var levelEl = levelEl || indoorLevels[selectedLevel - 1];
			$(levelEl.querySelector('.level__pins')).addClass('level__pins--active');
		}
	
		/**
		 * Removes the level´s pins
		 */
		function removePins(levelEl) {
			var levelEl = levelEl || indoorLevels[selectedLevel - 1];
			$(levelEl.querySelector('.level__pins')).removeClass('level__pins--active');
		}
	
		/**
		 * Show the navigation ctrls
		 */
		function showindoornav() {
			$(indoornav).removeClass('indoornav--hidden');
		}
	
		/**
		 * Hide the navigation ctrls
		 */
		function hideindoornav() {
			$(indoornav).addClass('indoornav--hidden');
		}
	
		/**
		 * Show the surroundings level
		 */
		function showSurroundings() {
			indoorSurroundings.forEach(function(el) {
				$(el).removeClass('surroundings--hidden');
			});
		}
	
		/**
		 * Hide the surroundings level
		 */
		function hideSurroundings() {
			indoorSurroundings.forEach(function(el) {
				$(el).addClass('surroundings--hidden');
			});
		}
	
		/**
		 * Navigate through the indoor´s levels
		 */
		function navigate(direction) {
			if( isNavigating || !isExpanded || isOpenContentArea ) {
				return false;
			}
			isNavigating = true;
	
			var prevSelectedLevel = selectedLevel;
	
			// current level
			var currentLevel = indoorLevels[prevSelectedLevel-1];
	
			if( direction === 'Up' && prevSelectedLevel > 1 ) {
				--selectedLevel;
			}
			else if( direction === 'Down' && prevSelectedLevel < indoorLevelsTotal ) {
				++selectedLevel;
			}
			else {
				isNavigating = false;	
				return false;
			}
	
			// transition direction class
			$(currentLevel).addClass(`level--moveOut${direction}`);
			// next level element
			var nextLevel = indoorLevels[selectedLevel-1]
			// ..becomes the current one
			$(nextLevel).addClass('level--current');
	
			// when the transition ends..
			onEndTransition(currentLevel, function() {
				$(currentLevel).removeClass(`level--moveOut${direction}`);
				// solves rendering bug for the SVG opacity-fill property
				setTimeout(function() {$(currentLevel).removeClass('level--current');}, 60);
	
				$(indoorLevelsEl).removeClass(`levels--selected-${prevSelectedLevel}`);
				$(indoorLevelsEl).addClass(`levels--selected-${selectedLevel}`);
	
				// show the current level´s pins
				showPins();
	
				isNavigating = false;
			});
	
			// filter the spaces for this level
			showLevelSpaces();
	
			// hide the previous level´s pins
			removePins(currentLevel);
		}
	
		/**
		 * Opens/Reveals a content item.
		 */
		function openContent(spacerefval) {
			console.log(spacerefval, 'spacerefval')
			// if one already shown:
			if( isOpenContentArea ) {
				hideSpace();
				spaceref = spacerefval;
				showSpace();
			}
			else {
				spaceref = spacerefval;
				openContentArea();
			}
			
			// remove class active (if any) from current list item
			var activeItem = spacesEl.querySelector('li.list__item--active');
			if( activeItem ) {
				$(activeItem).removeClass('list__item--active');
			}
			// list item gets class active
			console.log('spacesEl', spacesEl.querySelector(`li[data-space="${spacerefval}"]`))
			$(spacesEl.querySelector(`li[data-space="${spacerefval}"]`)).addClass('list__item--active');
	
			// remove class selected (if any) from current space
			var activeSpaceArea = indoorLevels[selectedLevel - 1].querySelector('svg > .map_space--selected');
			if( activeSpaceArea ) {
				$(activeSpaceArea).removeClass('map_space--selected');
			}
			// svg area gets selected
			$('svg > .map_space[data-space="' + spaceref + '"]').addClass('map_space--selected');
		}
	
		/**
		 * Opens the content area.
		 */
		function openContentArea() {
			isOpenContentArea = true;
			// shows space
			showSpace(true);
			// show close ctrl
			$(contentCloseCtrl).removeClass('content__button--hidden');
			// resize indoor area
			$(indoor).addClass('indoor--content-open');
		}
	
		/**
		 * Shows a space.
		 */
		function showSpace(sliding) {
			// the content item
			const contentItem = document.querySelector(`.content__item[data-space='${spaceref}']`);
			// show content
			$(contentItem).addClass('content__item--current');
			if( sliding ) {
				onEndTransition(contentItem, function() {
					$(contentEl).addClass('content--open');
				});
			}
			// map pin gets selected
			$(`.pin[data-space='${spaceref}']`).addClass('--active');
		}
	
		/**
		 * Closes the content area.
		 */
		function closeContentArea() {
			$(contentEl).removeClass('content--open');
			// close current space
			hideSpace();
			// hide close ctrl
			$(contentCloseCtrl).addClass('content__button--hidden');
			// resize indoor area
			$(indoor).removeClass('indoor--content-open');
			// enable indoor nav ctrls
			isOpenContentArea = false;
		}
	
		/**
		 * Hides a space.
		 */
		function hideSpace() {
			// the content item
			var contentItem = contentEl.querySelector('.content__item[data-space="' + spaceref + '"]');
			// hide content
			$(contentItem).removeClass('content__item--current');
			// map pin gets unselected
			$(indoorLevelsEl.querySelector('.pin[data-space="' + spaceref + '"]')).removeClass('--active');
			// remove class active (if any) from current list item
			var activeItem = spacesEl.querySelector('li.list__item--active');
			if( activeItem ) {
				$(activeItem).removeClass('list__item--active');
			}
			// remove class selected (if any) from current space
			var activeSpaceArea = indoorLevels[selectedLevel - 1].querySelector('svg > .map_space--selected');
			if( activeSpaceArea ) {
				$(activeSpaceArea).removeClass('map_space--selected');
			}
		}
	
		/**
		 * for smaller screens: open search bar
		 */
		function openSearch() {
			// shows all levels - we want to show all the spaces for smaller screens 
			showAllLevels();
	
			$(spacesListEl).addClass('spaces-list--open');
			$(containerEl).addClass('container--overflow');
		}
	
		/**
		 * for smaller screens: close search bar
		 */
		function closeSearch() {
			$(spacesListEl).removeClass('spaces-list--open');
			$(containerEl).removeClass('container--overflow');
		}
		
		init();