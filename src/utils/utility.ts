import { createCanvas, SKRSContext2D } from '@napi-rs/canvas';

type RenderingContext = SKRSContext2D;
type Style = string | CanvasGradient | CanvasPattern;
type TextAlignment = "center" | "end" | "left" | "right" | "start";

function dottedLine(startX: number, startY: number, endX: number, endY: number, style: Style, pattern: number[], ctx: CanvasRenderingContext2D | any, width: number = 1) {
    ctx.beginPath();
    ctx.strokeStyle = style;
    ctx.setLineDash(pattern);
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.lineWidth = width
    ctx.stroke();
}

function line(startX: number, startY: number,endX: number, endY: number, style: Style , ctx: RenderingContext, width: number = 1) {
    ctx.beginPath();
    ctx.strokeStyle = style;
    ctx.setLineDash([]);
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.lineWidth = width
    ctx.stroke();
}

function text(fillText: string, x: number, y: number, font: string, style: Style, ctx: RenderingContext, alignment: TextAlignment = 'left', maxWidth: number = 0) {
    if (fillText.includes('\n')) {
        const metrics = ctx.measureText(fillText)
        const height = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent + 2
        
        let currY = y;
        const lines = fillText.split('\n')
        for (const line of lines) {
            text(line, x, currY, font, style, ctx, alignment, maxWidth)
            currY += height
        }

        return
    }

    ctx.fillStyle = style
    ctx.strokeStyle = style
    ctx.font = font;
    ctx.textAlign = alignment

    console.log(x, y)

    ctx.fillText(fillText, x, y, maxWidth);
}

function textWrapped(str: string, x: number, y: number, font: string, style: Style, ctx: RenderingContext, maxWidth: number, maxHeight: number, alignment: TextAlignment = "left") {
    let newStr = wrap(str, font, style, ctx, maxWidth)
    text(newStr, x, y, font, style, ctx, alignment, maxWidth);
}

function wrap(str: string, font: string, style: Style, ctx: RenderingContext, maxWidth: number) {
    ctx.font = font;
    ctx.fillStyle = style

    const lines = str.split('\n')
    const newStr = []
    for (const line of lines) {
        const words = line.split(' ');
        let currStr = []
        for (const word of words) {
            currStr.push(word)
            if (ctx.measureText(currStr.join(' ')).width > maxWidth) {
                const lastWord = currStr.pop()
                newStr.push(currStr.join(' '))
                currStr = []
                currStr.push(lastWord)
            }
        }
        newStr.push(currStr.join(' ').trim())
    }

    return newStr.join('\n').trim()
}

function barcode(x: number, y: number, pattern: number[], barHeight: number, barWidth: number, styleFilled: Style, styleEmpty: Style,  ctx: RenderingContext) {
    for (let i = 0; i < pattern.length; i++) {
        line(x + (barWidth * i) + (barWidth / 2), y, x + (barWidth * i) + (barWidth / 2), y + barHeight, (pattern[i] === 0 ? styleEmpty : styleFilled), ctx, barWidth);
    }
}

function rect(x: number, y: number, w: number, h: number, style: string | Style, ctx: RenderingContext) {
    ctx.fillStyle = style;
    ctx.fillRect(x, y, w, h);
}

function textFitsWidth(text: string, font: string, ctx: RenderingContext, maxWidth: number | null): boolean {
    ctx.font = font;
    return ctx.measureText(text).width <= maxWidth;
}

function textFitsHeight(text: string, font: string, ctx: RenderingContext, maxHeight: number): boolean {
    ctx.font = font;
    let metrics = ctx.measureText(text);
    return (metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent + 2) * text.split('\n').length <= maxHeight;
}

function tint(image: any, color: string, opacity = 0.5) {
    const canvas = createCanvas(image.width, image.height)
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = color;
    ctx.globalAlpha = opacity;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = "destination-atop"
    ctx.globalAlpha = 1;
    ctx.drawImage(image, 0, 0);
    return canvas
}

export {
    line,
    dottedLine,
    rect,
    barcode,
    textWrapped,
    text,
    textFitsHeight,
    textFitsWidth,
    wrap,
    tint
}