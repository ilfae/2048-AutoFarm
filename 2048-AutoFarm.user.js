// ==UserScript==
// @name         2048 AutoFarm
// @namespace    KittenWoof
// @match        *://*app.bcoin2048.com/*
// @version      1.3
// @grant        none
// @icon         https://app.pipipupu.ru/static/media/bicoin.3eeb27b9fe87c93bc2b1302c6adc8234.svg
// ==/UserScript==

let lastBoard = null;
let sameMoveCounter = 0;
let lastMove = '';
let isGamePaused = true;
let gameInterval = null;

function getBoardState() {
    const board = [];
    const tiles = document.querySelectorAll('.tileWrapper');

    for (let i = 0; i < 4; i++) {
        board.push([0, 0, 0, 0]);
    }

    tiles.forEach(tile => {
        const valueElement = tile.querySelector('p');
        if (valueElement) {
            const value = parseInt(valueElement.textContent.trim(), 10);

            const transform = tile.style.transform.match(/translate\((-?\d+(\.\d+)?px), (-?\d+(\.\d+)?px)\)/);
            if (transform) {
                const [, x, , y] = transform;

                const gridX = Math.round(parseFloat(x) / 90);
                const gridY = Math.round(parseFloat(y) / 90);

                if (gridX >= 0 && gridX < 4 && gridY >= 0 && gridY < 4) {
                    board[gridY][gridX] = value;
                }
            }
        }
    });

    return board;
}

function simulateSwipe(direction) {
    const boardElement = document.getElementById("board");

    if (boardElement) {
        let touchStartEvent, touchMoveEvent, touchEndEvent;

        const rect = boardElement.getBoundingClientRect();
        const startX = rect.left + rect.width / 2;
        const startY = rect.top + rect.height / 2;
        let endX = startX;
        let endY = startY;

        switch (direction) {
            case 'right':
                endX = startX + 100;
                break;
            case 'left':
                endX = startX - 100;
                break;
            case 'up':
                endY = startY - 100;
                break;
            case 'down':
                endY = startY + 100;
                break;
        }

        const touchObj = new Touch({
            identifier: Date.now(),
            target: boardElement,
            clientX: startX,
            clientY: startY,
            radiusX: 10,
            radiusY: 10,
            rotationAngle: 0,
            force: 1.0
        });

        touchStartEvent = new TouchEvent('touchstart', {
            bubbles: true,
            cancelable: true,
            touches: [touchObj],
            targetTouches: [touchObj],
            changedTouches: [touchObj]
        });

        const touchMoveObj = new Touch({
            identifier: touchObj.identifier,
            target: boardElement,
            clientX: endX,
            clientY: endY,
            radiusX: 10,
            radiusY: 10,
            rotationAngle: 0,
            force: 1.0
        });

        touchMoveEvent = new TouchEvent('touchmove', {
            bubbles: true,
            cancelable: true,
            touches: [touchMoveObj],
            targetTouches: [touchMoveObj],
            changedTouches: [touchMoveObj]
        });

        touchEndEvent = new TouchEvent('touchend', {
            bubbles: true,
            cancelable: true,
            touches: [],
            targetTouches: [],
            changedTouches: [touchMoveObj]
        });
        boardElement.dispatchEvent(touchStartEvent);

        setTimeout(() => {
            boardElement.dispatchEvent(touchMoveEvent);
            setTimeout(() => {
                boardElement.dispatchEvent(touchEndEvent);
            }, 200);
        }, 200);
    }
}






function decideMove(board) {
    const directions = ['up', 'down', 'left', 'right'];

    function hasBoardChanged(currentBoard, previousBoard) {
        if (!previousBoard) return true;
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                if (currentBoard[i][j] !== previousBoard[i][j]) {
                    return true;
                }
            }
        }
        return false;
    }

    function canMergeOrMove(board, direction) {
        let newBoard = simulateMove(board, direction);
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                if (board[i][j] !== newBoard[i][j]) {
                    return true;
                }
            }
        }
        return false;
    }

    function simulateMove(board, direction) {
        let newBoard = JSON.parse(JSON.stringify(board));

        switch (direction) {
            case 'up':
                for (let col = 0; col < 4; col++) {
                    let tempCol = [];
                    for (let row = 0; row < 4; row++) {
                        if (newBoard[row][col] !== 0) tempCol.push(newBoard[row][col]);
                    }
                    for (let i = 0; i < tempCol.length - 1; i++) {
                        if (tempCol[i] === tempCol[i + 1]) {
                            tempCol[i] *= 2;
                            tempCol[i + 1] = 0;
                        }
                    }
                    tempCol = tempCol.filter(value => value !== 0);
                    for (let row = 0; row < 4; row++) {
                        newBoard[row][col] = tempCol[row] || 0;
                    }
                }
                break;
            case 'down':
                for (let col = 0; col < 4; col++) {
                    let tempCol = [];
                    for (let row = 3; row >= 0; row--) {
                        if (newBoard[row][col] !== 0) tempCol.push(newBoard[row][col]);
                    }
                    for (let i = 0; i < tempCol.length - 1; i++) {
                        if (tempCol[i] === tempCol[i + 1]) {
                            tempCol[i] *= 2;
                            tempCol[i + 1] = 0;
                        }
                    }
                    tempCol = tempCol.filter(value => value !== 0);
                    for (let row = 3; row >= 0; row--) {
                        newBoard[row][col] = tempCol[3 - row] || 0;
                    }
                }
                break;
            case 'left':
                for (let row = 0; row < 4; row++) {
                    let tempRow = newBoard[row].filter(value => value !== 0);
                    for (let i = 0; i < tempRow.length - 1; i++) {
                        if (tempRow[i] === tempRow[i + 1]) {
                            tempRow[i] *= 2;
                            tempRow[i + 1] = 0;
                        }
                    }
                    tempRow = tempRow.filter(value => value !== 0);
                    for (let col = 0; col < 4; col++) {
                        newBoard[row][col] = tempRow[col] || 0;
                    }
                }
                break;
            case 'right':
                for (let row = 0; row < 4; row++) {
                    let tempRow = newBoard[row].filter(value => value !== 0);
                    for (let i = tempRow.length - 1; i > 0; i--) {
                        if (tempRow[i] === tempRow[i - 1]) {
                            tempRow[i] *= 2;
                            tempRow[i - 1] = 0;
                        }
                    }
                    tempRow = tempRow.filter(value => value !== 0);
                    for (let col = 3; col >= 0; col--) {
                        newBoard[row][col] = tempRow[3 - col] || 0;
                    }
                }
                break;
        }

        return newBoard;
    }

    function evaluateBoard(board) {
        let score = 0;
        let emptySpaces = 0;

        for (let row = 0; row < 4; row++) {
            for (let col = 0; col < 4; col++) {
                if (board[row][col] === 0) {
                    emptySpaces++;
                }
                score += board[row][col];
            }
        }

        return score + emptySpaces * 1000;
    }

    let bestMove = null;
    let bestScore = -Infinity;

    if (!hasBoardChanged(board, lastBoard)) {
        sameMoveCounter++;
    } else {
        sameMoveCounter = 0;
    }

    if (sameMoveCounter >= 1) {
        const otherDirections = directions.filter(dir => dir !== lastMove);
        return otherDirections[Math.floor(Math.random() * otherDirections.length)];
    }

    for (let direction of directions) {
        if (canMergeOrMove(board, direction)) {
            let simulatedBoard = simulateMove(board, direction);
            let boardScore = evaluateBoard(simulatedBoard);

            if (boardScore > bestScore) {
                bestScore = boardScore;
                bestMove = direction;
            }
        }
    }

    lastBoard = JSON.parse(JSON.stringify(board));
    lastMove = bestMove;

    return bestMove || 'up';
}



function playGame() {
    if (!isGamePaused) {
        const board = getBoardState();
//        console.log(board);

        const move = decideMove(board);
//        console.log(`Свайп в ${move}`);
        simulateSwipe(move);
        gameInterval = setTimeout(playGame, 500);
    }
}

function createMenu() {
    const controlsContainer = document.createElement('div');
    controlsContainer.style.position = 'fixed';
    controlsContainer.style.bottom = '0';
    controlsContainer.style.right = '0';
    controlsContainer.style.zIndex = '9999';
    controlsContainer.style.backgroundColor = 'black';
    controlsContainer.style.padding = '10px 20px';
    controlsContainer.style.borderRadius = '10px';
    controlsContainer.style.cursor = 'move';
    document.body.appendChild(controlsContainer);

    const buttonsContainer = document.createElement('div');
    buttonsContainer.style.display = 'flex';
    buttonsContainer.style.justifyContent = 'center';
    controlsContainer.appendChild(buttonsContainer);

    const hiddenLink = document.createElement('div');
    hiddenLink.id = 'logDisplay';
    hiddenLink.style.color = 'white';
    hiddenLink.style.marginBottom = '10px';
    controlsContainer.prepend(hiddenLink);
    OutGamePausedTrue();

    const pauseButton = document.createElement('button');
    pauseButton.textContent = isGamePaused ? '▶' : '❚❚';
    pauseButton.style.padding = '4px 8px';
    pauseButton.style.backgroundColor = '#5d2a8f';
    pauseButton.style.color = 'white';
    pauseButton.style.border = 'none';
    pauseButton.style.borderRadius = '10px';
    pauseButton.style.cursor = 'pointer';
    pauseButton.style.marginRight = '5px';
    pauseButton.onclick = togglePause;
    buttonsContainer.appendChild(pauseButton);

    function togglePause() {
        isGamePaused = !isGamePaused;
        pauseButton.textContent = isGamePaused ? '▶' : '❚❚';

        if (!isGamePaused) {
            playGame();
        } else {
            clearTimeout(gameInterval);
        }
    }
}

function OutGamePausedTrue() {
    const GamePausedTrue = atob('VEc6IEtpdHRlbldvZg==');
    const GamePausedFalse = atob('aHR0cHM6Ly90Lm1lL2tpdHRlbndvZg==');
    document.getElementById('logDisplay').innerHTML = `<a href="${GamePausedFalse}" target="_blank" style="color: white; text-decoration: none;">${GamePausedTrue}</a>`;
}

createMenu();
