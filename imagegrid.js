"use strict";

/*
Grid generation for quadratic pictures
Frame conditions:
	* Image resize is not allowed
	* Image crop is allowed
	* No variable whitespace between images
	* Grid width is given

Test:
	* When there are not enough images for two rows, put all in one line,
	  ordered by size.
	* If there is one incomplete row, move whitespace to the right side.

Algorithm description:
	Begin with largest square (because the first square will have the biggest scaledown)
	Append similar squares to one edge
	Repeat this for the resulting rectangle
	Possibly crop the whole rectangle
	Result: Big rectangles that do not fit together
	Put big rectangles in rows
*/

/************************************************************************/

/* Padding between images */
var PADDING = 1;

/* Divide edges more often */
var LESS_BORING_BLOCKS = true;

/* Highest allowed size reduction.
/* The maximum image scaledown is the product of these two values. */

var MAX_SQUARE_SCALEDOWN = 0.8;
var MAX_RECT_SCALEDOWN = 0.8;

/* Fraction of GRID_WIDTH. Lower for smaller rectangles. */
var MAX_RECT_WIDTH = 0.4;

/* Width of image grid */
var GRID_WIDTH = 600;

var images = [
	{ url: 'url here', size : 78 },
	{ size : 73 },
	{ size : 50 },
	{ size : 51 },
	{ size : 55 },
];

/************************************************************************/

var VERTICAL = 0;
var HORIZONTAL = 1;

var rectNumber = 0;

var rectObjects = [ ];

function CreateRandomImages()
{
	var i, rndsize;
	for (i = 0; i < 100; ++i) {
		rndsize = 100 * Math.random();
		if (rndsize < 30) {
			--i;
			continue;
		}
		images.push({ size : rndsize });
	}
}

function InitImages()
{
	var i;
	for (i = 0; i < images.length; ++i) {
		images[i].crop = images[i].size;
		images[i].inuse = false;
	}
}

function GetRandomColor() {
	var letters = '0123456789ABCDEF'.split('');
	var color = '#';
	for (var i = 0; i < 6; ++i) {
		color += letters[Math.round(Math.random() * 15)];
	}
	return color;
}

/**
Add images to `element`.
*/
function LoadImages(element)
{
	var i, list, img, div, parent;

	CreateRandomImages();
	InitImages();

	parent = document.getElementById('divgrid');
	ConstructRectObjects();
	PositionRectObjects();
	PositionImages();

	for (i = 0; i < images.length; ++i) {
		div = document.createElement('div');
//		div.style.backgroundImage = img.url;
		div.innerHTML = '<small>' + images[i].rectNumber + "<br/>" +
			Math.round(images[i].crop / images[i].size * 100) + '%</small>';
		div.style.backgroundColor = GetRandomColor();
		div.style.position = 'absolute';
		div.style.left = images[i].x + 'px';
		div.style.top = images[i].y + 'px';
		div.style.height = images[i].crop + 'px';
		div.style.width = images[i].crop + 'px';
		parent.appendChild(div);
	}
}

/**
Calculate x and y coordinates for all images in `rectObject`.
*/
function PositionRectImages(rectObject)
{
	var i, k;
	var list;
	var x, y;

	// position first element
	images[rectObject.rectList[0].indices[0]].x = rectObject.x;
	images[rectObject.rectList[0].indices[0]].y = rectObject.y;
	x = images[rectObject.rectList[0].indices[0]].crop + PADDING;
	y = images[rectObject.rectList[0].indices[0]].crop + PADDING;

	for (i = 1; i < rectObject.rectList.length; ++i) {
		list = rectObject.rectList[i];
		if (list.align == VERTICAL) {
			for (k = 0; k < list.indices.length; ++k) {
				images[list.indices[k]].x = rectObject.x + x;
				images[list.indices[k]].y = rectObject.y + k * images[list.indices[0]].crop;
				images[list.indices[k]].y += k * PADDING;
			}
			x += images[list.indices[0]].crop + PADDING;
		} else {
			for (k = 0; k < list.indices.length; ++k) {
				images[list.indices[k]].x = rectObject.x + k * images[list.indices[0]].crop;
				images[list.indices[k]].y = rectObject.y + y;
				images[list.indices[k]].x += k * PADDING;
			}
			y += images[list.indices[0]].crop + PADDING;
		}
	}
}

function PositionImages()
{
	var i;
	for (i = 0; i < rectObjects.length; ++i) {
		if (rectObjects[i].inuse === false) continue;
		PositionRectImages(rectObjects[i]);
	}
}

/**
Recursively fill an area with rectangles.
*/
function FillWithRects(x, y, width, height)
{
	var i;
	for (i = 0; i < rectObjects.length; ++i) {
		if (rectObjects[i].inuse === true) {
			continue;
		}

		if (rectObjects[i].width > width || rectObjects[i].height > height) {
			continue;
		}

		rectObjects[i].x = x;
		rectObjects[i].y = y;
		rectObjects[i].inuse = true;

		// fill right side
		FillWithRects(x + rectObjects[i].width + PADDING, y,
			width - rectObjects[i].width - PADDING, rectObjects[i].height);

		if (height === Infinity) {
			return;
		}

		// fill bottom side
		FillWithRects(x, y + rectObjects[i].height + PADDING,
			rectObjects[i].width, height - rectObjects[i].height);
		return;
	}
}

function AllRectsUsed()
{
	var i;
	for (i = 0; i < rectObjects.length; ++i) {
		if (rectObjects[i].inuse === false) {
			return false;
		}
	}
	return true;
}

function GetLowestRect()
{
	var i;
	var lowest = 0;
	for (i = 0; i < rectObjects.length; ++i) {
		if (rectObjects.inuse === false) {
			continue;
		}
		if (rectObjects[i].y + rectObjects[i].height > lowest) {
			lowest = rectObjects[i].y + rectObjects[i].height;
		}
	}
	return lowest + PADDING;
}

function PositionRectObjects()
{
	var i;
	for (i = 0; i < rectObjects.length; ++i) {
		rectObjects[i].inuse = false;
	}

	rectObjects.sort(function(a, b) {
		return b.height - a.height;
	});

	while (true) {
		FillWithRects(0, GetLowestRect(), GRID_WIDTH, Infinity);
		if (AllRectsUsed() === true) {
			break;
		}
	}
}

function ConstructRectObjects()
{
	var largest;
	while ((largest = GetLargestSquare()) !== null) {
		rectObjects.push(ConstructRect(largest));
	}
}

function RotateRectObject(rectObject)
{
	var i;
	var tmp;

	tmp = rectObject.height;
	rectObject.height = rectObject.width;
	rectObject.width = tmp;

	for (i = 0; i < rectObject.rectList.length; ++i) {
		if (rectObject.rectList[i].align == VERTICAL) {
			rectObject.rectList[i].align = HORIZONTAL;
		} else {
			rectObject.rectList[i].align = VERTICAL;
		}
	}
}

function ScaleRectObject(rectObject, oldSize, newSize, align)
{
	var i, k;
	var indices;
	var padWidth, padHeight;

	padWidth = 0;
	padHeight = 0;
	for (i = 1; i < rectObject.rectList.length; ++i) {
		if (rectObject.rectList[i].align == VERTICAL) {
			padWidth += PADDING;
		} else {
			padHeight += PADDING;
		}
	}

	if (align == VERTICAL) {
		oldSize -= padWidth;
		newSize -= padWidth;
	} else {
		oldSize -= padHeight;
		newSize -= padHeight;
	}

	/* Prevent a rectangle to get scaled down too often */
	rectObject.score *= newSize / oldSize;
	if (rectObject.score < MAX_RECT_SCALEDOWN) {
		return 1;
	}


	for (i = 0; i < rectObject.rectList.length; ++i) {
		indices = rectObject.rectList[i].indices;
		for (k = 0; k < indices.length; ++k) {
			images[indices[k]].crop *= newSize / oldSize;
		}
	}

	rectObject.width = (rectObject.width - padWidth) * newSize / oldSize + padWidth;
	rectObject.height = (rectObject.height - padHeight) * newSize / oldSize + padHeight;
	return 0;
}

function RectObjectPush(rectObject, edge)
{
	var i;
	for (i = 0; i < edge.indices.length; ++i) {
		images[edge.indices[i]].inuse = true;
	}
	rectObject.rectList.push(edge);
}

/**
Begins with the square `begin` and construct a rectangle of squares with neither overlap
nor whitespace.
*/
function ConstructRect(begin)
{
	var edgeRight, edgeBottom;
	var cropSize;
	var rectObject = { };

	++rectNumber;

	rectObject.score = 1;
	rectObject.width = images[begin].crop;
	rectObject.height = images[begin].crop;
	rectObject.rectList = [ { indices : [ begin ], align : VERTICAL } ];
	images[begin].rectNumber = rectNumber;
	images[begin].inuse = true;

	do {
		edgeRight = FindEdgeSquares(rectObject.height);
		if (edgeRight !== null) {
			var newWidth;

			newWidth = rectObject.width + images[edgeRight.indices[0]].crop + PADDING;
			if (newWidth > GRID_WIDTH) {
				break;
			}

			cropSize = images[edgeRight.indices[0]].crop * edgeRight.indices.length;
			cropSize += (edgeRight.indices.length - 1) * PADDING;

			if (cropSize < rectObject.height
				&& ScaleRectObject(rectObject, rectObject.height, cropSize, VERTICAL))
			{
				edgeRight = null;
			} else {
				rectObject.width += images[edgeRight.indices[0]].crop + PADDING;
				edgeRight.align = VERTICAL;
				RectObjectPush(rectObject, edgeRight);
			}
		}

		edgeBottom = FindEdgeSquares(rectObject.width);
		if (edgeBottom !== null) {
			cropSize = images[edgeBottom.indices[0]].crop * edgeBottom.indices.length;
			cropSize += (edgeBottom.indices.length - 1) * PADDING;

			if (cropSize < rectObject.width
				&& ScaleRectObject(rectObject, rectObject.width, cropSize, HORIZONTAL))
			{
				edgeBottom = null;
			} else {
				rectObject.height += images[edgeBottom.indices[0]].crop + PADDING;
				edgeBottom.align = HORIZONTAL;
				RectObjectPush(rectObject, edgeBottom);
			}
		}

		if (rectObject.width > MAX_RECT_WIDTH * GRID_WIDTH) {
			break;
		}
	} while (edgeRight !== null || edgeBottom !== null);

	if (rectObject.width < rectObject.height && rectObject.height < GRID_WIDTH) {
		RotateRectObject(rectObject);
	}

	return rectObject;
}

/**
Find an optimal list of squares that can be put in a row and appended to
an edge with the length `size`.
*/
function FindEdgeSquares(size)
{
	var i, k;
	var bestEdge, candi;
	var maxScore;
	var minSize;

	bestEdge = null;
	for (i = 1; i < 7; ++i) {
		candi = GetEdgeCandidates(size - (i - 1) * PADDING, i);
		if (candi === null) {
			continue;
		}

		if (bestEdge === null || candi.score > maxScore) {
			maxScore = candi.score;
			bestEdge = candi;
		}
	}

	if (bestEdge === null) {
		return null;
	}

	minSize = size / bestEdge.indices.length - (bestEdge.indices.length - 1) * PADDING;
	for (i = 0; i < bestEdge.indices.length; ++i) {
		if (images[bestEdge.indices[i]].size < minSize) {
			minSize = images[bestEdge.indices[i]].size;
		}
	}

	for (i = 0; i < bestEdge.indices.length; ++i) {
		images[bestEdge.indices[i]].crop = minSize;
		images[bestEdge.indices[i]].rectNumber = rectNumber;
	}

	return bestEdge;
}

function GetEdgeCandidates(size, count)
{
	var i, k;
	var edgeScore;
	var imgcopy = [ ];
	var indices = [ ];

	for (i = 0, k = 0; i < images.length; ++i) {
		if (images[i].inuse === true) {
			continue;
		}
		imgcopy[k] = { };
		imgcopy[k].index = i;
		imgcopy[k].score = images[i].size / (size / count);
		if (imgcopy[k].score > 1) {
			imgcopy[k].score = 1 / imgcopy[k].score;
		}
		++k;
	}

	if (k < count) {
		return null;
	}

	imgcopy.sort(function(a, b) {
		return b.score - a.score;
	});
	imgcopy = imgcopy.slice(0, count);

	edgeScore = 1;
	for (i = 0; i < count; ++i) {
		if (imgcopy[i].score < MAX_SQUARE_SCALEDOWN) {
			return null;
		}
		edgeScore *= imgcopy[i].score;
		indices[i] = imgcopy[i].index;
	}

	if (LESS_BORING_BLOCKS === true && count > 1) {
		edgeScore = Math.sqrt(Math.sqrt(edgeScore));
	}

	return { indices : indices, score : edgeScore };
}

function GetLargestSquare()
{
	var i;
	var maxIndex = null;
	for (i = 0; i < images.length; ++i) {
		if (images[i].inuse === true) {
			continue;
		}
		if (maxIndex === null || images[i].size > images[maxIndex].size) {
			maxIndex = i;
		}
	}
	return maxIndex;
}

window.onload = LoadImages;

