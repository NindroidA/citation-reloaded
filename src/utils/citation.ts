import { createCanvas, loadImage, Image, Canvas, SKRSContext2D } from '@napi-rs/canvas';
import { text, textWrapped, line, dottedLine, barcode, rect, textFitsHeight, wrap, tint } from './utility';
import Encoder from 'gif-encoder-2';
import fs from 'fs';
import path from 'path';

type RenderingContext = SKRSContext2D;

export class Citation {

    moaBg: string = '#F3D7E6'; // background color of the citation
    moaFg: string = '#BFA8A8'; // foreground color of the citation
    moaFt: string = '#5A5559'; // the font and separator color of the citation

    private width: number; // width of the citation
    private height: number; // height of the citation
    private barcode: number[]; // the barcode at the top left penalty

    resizeReason: boolean = false; // should it resize automatically when text is overflowing

    /**
     * max height to resize to before truncating
     * must be >= to current height, or is ignored
     * can cause issues with reason text being very close to the bottom separator
    */
    resizeLimit: number = 0;

    private logo: Image = null; // the logo put at the mid-bottom of the citation
    private canvas: Canvas = null;
    private ctx: RenderingContext = null;

    title: string = "M.O.A. CITATION"; // title of the citation
    reason: string = 'Protocol Violated.\nEntry Permit: Invalid Name'; // content/reason for the citation
    penalty: string = 'LAST WARNING - NO PENALTY'; // penalties of the citation

    topBottomDotSize: number = 2; // dot size for the dotted line at the top & bottom
    sideDotSize: number = 6; // dot size for the dots at the sides of the citation
    sideDotSpacing: number = 4; // spacing between the dots at the sides of the citation
    separatorDotSize: number = 2; // size of dots in the dotted lines
    barcodeWidth: number = 2; // width of each strip of the barcode
    barcodeHeight: number = 12; // height of each strip of the barcode; dot at the left is half of this height
    fontSize: number = 16; // size of the font
    logoScale: number = 1; // scale of the rendered logo

    log = (...args: any[]) => { }; // for verbose logging

    constructor(width: number, height: number, barcode: number[]) {
        this.width = width;
        this.height = height;
        this.barcode = barcode;
    }

    // instantiates the canvas and loads the logo (whatever that means lmao)
    private async createCanvas(): Promise<void> {
        this.canvas = createCanvas(this.width, this.height);
        this.ctx = this.canvas.getContext('2d');

        if (!this.logo) {
            const logoPath = path.join(__dirname, '..', 'assets', 'logo.png');
            this.logo = await loadImage(logoPath);
        }
    }

    /**
     * @param out Path to output file
     * @param gif Render a gif version
     * @param frameRate Frame rate of the rendered gif
     * @param yPos Y position of the citation at each frame
     * @return the rendered gif or png. if **out** is specified then it also gets piped into that file
     */
    async render(out: string, gif: boolean = false, frameRate: number = 10, yPos: number[] = null): Promise<Buffer> {
        await this.draw()
        const b = this.canvas.toBuffer('image/png');
        let data = gif ? await this.animated(frameRate, yPos) : b
        if (out) {
            fs.writeFileSync(out, data)
        }
        return data
    }

    // you'll never guess what this function does
    private async draw(): Promise<void> {
        await this.createCanvas()

        if (this.resizeReason) {
            let wrapped = wrap(this.reason, this.getFont, this.moaFt, this.ctx, this.reasonMaxWidth)
            const ogHeight = this.height;
            let newHeight = this.height;
            if (!textFitsHeight(wrapped, this.getFont, this.ctx, this.reasonMaxHeight)) {
                this.ctx.font = this.getFont;
                let metrics = this.ctx.measureText(wrapped);
                newHeight += (metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent + 2) * wrapped.split('\n').length - this.reasonMaxHeight;
                if (this.resizeLimit > ogHeight) {
                    if (newHeight > this.resizeLimit) {
                        newHeight = this.resizeLimit;
                    }
                }
            }
            this.height = newHeight;
            await this.createCanvas();
        }

        // background
        rect(0, 0, this.width, this.height, this.moaBg, this.ctx);

        // Logo
        this.ctx.drawImage(tint(this.logo, this.moaFg), (this.width / 2) - ((this.logo.height * this.logoScale) / 2) - 1, this.height - (this.bottomSeparatorSpacingFromBottom + ((this.logo.height * this.logoScale) / 2)) + 4, this.logo.width * this.logoScale, this.logo.height * this.logoScale);

        // Top and bottom dots
        dottedLine(0, this.topBottomDotSize / 2, this.width, this.topBottomDotSize / 2, this.moaFg, [this.topBottomDotSize, this.topBottomDotSize], this.ctx, this.topBottomDotSize);
        dottedLine(this.topBottomDotSize, this.height - this.topBottomDotSize / 2, this.width, this.height - this.topBottomDotSize / 2, this.moaFg, [this.topBottomDotSize, this.topBottomDotSize], this.ctx, this.topBottomDotSize);

        // Dots on the sides
        dottedLine(this.sideDotsSpacingFromLeft + (this.sideDotSize / 2), this.sideDotsSpacingFromTop, this.sideDotsSpacingFromLeft + (this.sideDotSize / 2), this.height - this.topBottomDotSize, this.moaFg, [this.sideDotSize, this.sideDotSize * 2], this.ctx, this.sideDotSize);
        dottedLine(this.width - this.sideDotsSpacingFromRight - (this.sideDotSize / 2), this.sideDotsSpacingFromTop, this.width - this.sideDotsSpacingFromRight - (this.sideDotSize / 2), this.height - this.topBottomDotSize, this.moaFg, [this.sideDotSize, this.sideDotSize * 2], this.ctx, this.sideDotSize);

        // Separators
        dottedLine(this.separatorSpacingFromLeft, this.topSeparatorSpacingFromTop + (this.separatorDotSize / 2), this.width - this.separatorSpacingFromRight, this.topSeparatorSpacingFromTop + (this.separatorDotSize / 2), this.moaFt, [this.separatorDotSize, this.separatorDotSize], this.ctx, this.separatorDotSize);
        dottedLine(this.separatorSpacingFromLeft, this.height - (this.bottomSeparatorSpacingFromBottom + (this.separatorDotSize / 2)), this.width - this.separatorSpacingFromRight, this.height - (this.bottomSeparatorSpacingFromBottom + (this.separatorDotSize / 2)), this.moaFt, [this.separatorDotSize, this.separatorDotSize], this.ctx, this.separatorDotSize);

        // Line at the side
        line(this.width - (this.topBottomDotSize / 2), 0, this.width - (this.topBottomDotSize / 2), this.height, this.moaFg, this.ctx, this.topBottomDotSize);

        // Barcode
        barcode(this.width - this.barcodeSpacingFromRight - (this.barcode.length * this.barcodeWidth), this.barcodeSpacingFromTop, this.barcode, this.barcodeHeight, this.barcodeWidth, this.moaFt, this.moaBg, this.ctx);
        rect(this.width - this.barcodeSpacingFromRight - (this.barcode.length * this.barcodeWidth) - (this.barcodeWidth * 3), this.barcodeSpacingFromTop, this.barcodeWidth * 2, this.barcodeHeight / 2, this.moaFt, this.ctx);

        // Title
        text(this.title, this.textSpacingFromLeft, this.titleSpacingFromTop, this.getFont, this.moaFt, this.ctx, 'left', this.titleMaxWidth);

        // Reason
        textWrapped(this.reason, this.textSpacingFromLeft, this.reasonSpacingFromTop, this.getFont, this.moaFt, this.ctx, this.reasonMaxWidth, this.reasonMaxHeight)

        // Penalty
        text(this.penalty, (this.width / 2) - 3, this.height - this.penaltySpacingFromBottom, this.getFont, this.moaFt, this.ctx, 'center', this.reasonMaxWidth);
    }

    private easeOutQuad(t: number): number {
        if (t < 0.5) {
            return 1.5 * t * t;
        }
        return -1 + (4 - 2 * t) * t;
    }
    
    private generateAnimationFrames(start: number, end: number, frames: number): number[] {
        const result: number[] = [];
        for (let i = 0; i < frames; i++) {
            let t = i / (frames - 1);
            t = this.easeOutQuad(t);
            result.push(start + (end - start) * t);
        }
        return result;
    }
    
    private async animated(frameRate = 30, yPos = null): Promise<Buffer> {
        const encoder = new Encoder(this.width, this.height);
        const canvas = createCanvas(this.width, this.height);
        const ctx = canvas.getContext('2d');
    
        // stores y values of citation position
        let animation: number[] = yPos ?? [];
    
        if (!yPos) {
            let framesPerSegment = 12; // Adjust for desired speed
            let pauseFrames = 1; // Pause at each stop
            let finalPauseFrames = 60; // Longer pause at the end
    
            let startingPoint = this.sideDotsSpacingFromTop;
            let stopOne = this.topSeparatorSpacingFromTop;
            let stopTwo = stopOne + (this.height - stopOne) / 3;
            let stopThree = stopOne + 2 * (this.height - stopOne) / 3;
            let endPoint = this.height;
    
            let fullAnimation = [
                ...this.generateAnimationFrames(startingPoint, stopOne, framesPerSegment),
                ...Array(pauseFrames).fill(stopOne),
                ...this.generateAnimationFrames(stopOne, stopTwo, framesPerSegment),
                ...Array(pauseFrames).fill(stopTwo),
                ...this.generateAnimationFrames(stopTwo, stopThree, framesPerSegment),
                ...Array(pauseFrames).fill(stopThree),
                ...this.generateAnimationFrames(stopThree, endPoint, framesPerSegment),
                ...Array(finalPauseFrames).fill(endPoint)
            ];
    
            // pauses at each stop
            animation = [];
            let segmentLength = framesPerSegment;
            for (let i = 0; i < fullAnimation.length; i++) {
                animation.push(fullAnimation[i]);
                if ((i + 1) % segmentLength === 0 && i < fullAnimation.length - 1) {
                    animation.push(...Array(pauseFrames).fill(fullAnimation[i]));
                }
            }
    
            // final pause
            animation.push(...Array(finalPauseFrames).fill(endPoint));
        }
    
        encoder.setFrameRate(frameRate);
        encoder.useOptimizer = true;
        encoder.setQuality(5);
        encoder.setThreshold(50);
        encoder.setTransparent('#00000000');
    
        encoder.start();
        for (let i = 0; i < animation.length; i++) {
            ctx.clearRect(0, 0, this.width, this.height);
            ctx.drawImage(this.canvas, 0, this.height - animation[i]);
            encoder.addFrame(ctx);
            this.log(`\rEncoding frame ${i+1} of ${animation.length}`);
        }
        encoder.finish();
        this.log('\nEncoding Finished\n');
        return encoder.out.getData();
    }

    set setWidth(value: number) {
        if (typeof value !== 'number') throw new Error(`${value} is not a number`);
        if (value % 2 !== 0) {
            this.log(`width ${value} is not even | added one too it`);
            value += 1;
        }
        if (value < 100) throw new Error(`width can't be smaller then 100`);
        this.width = Math.round(value);
    }

    set setHeight(value: number) {
        if (typeof value !== 'number') throw new Error(`${value} is not a number`);
        if (value % 2 !== 0) {
            this.log(`width ${value} is not even | added one too it`);
            value += 1
        }
        if (value < 110) throw new Error(`height be smaller then 110`);
        this.height = Math.round(value);
    }

    set setBarcode(value: number[]) {
        for (let i = 0; i < value.length; i++) {
            if (value[i] !== 0 && value[i] !== 1) throw new Error("Barcode can only contain ones and zeros");
        }
        this.barcode = value;
    }

    get getFont(): string { return `${this.fontSize}px BMmini`; }
    get getHeight(): number { return this.height; }
    get getWidth(): number { return this.width; }


    /* private getters */
    private get sideDotsSpacingFromLeft() {
        return this.sideDotSpacing;
    }
    private get sideDotsSpacingFromTop() {
        return this.sideDotSpacing + this.topBottomDotSize;
    }
    private get sideDotsSpacingFromRight() {
        return this.sideDotSpacing + (this.topBottomDotSize) + 2;
    }

    private get separatorSpacingFromLeft() {
        return this.sideDotsSpacingFromLeft + this.sideDotSize + 6;
    }
    private get separatorSpacingFromRight() {
        return this.sideDotsSpacingFromRight + this.sideDotSize + 6;
    }
    private get topSeparatorSpacingFromTop() {
        this.ctx.font = this.getFont;
        const metrics = this.ctx.measureText(this.title);
        let titleHeight = (metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent + 2) * this.title.split('\n').length;
        return this.topBottomDotSize + (titleHeight * 2) + 4;
    }
    private get bottomSeparatorSpacingFromBottom() {
        return this.topBottomDotSize + (this.fontSize * 2) + 10;
    }

    private get barcodeSpacingFromRight() {
        return this.sideDotsSpacingFromRight + this.sideDotSize + 8;
    }
    private get barcodeSpacingFromTop() {
        return this.topBottomDotSize * 3;
    }
    private get textSpacingFromLeft() {
        return this.sideDotSpacing + this.sideDotSize + 12;
    }

    private get titleSpacingFromTop() {
        return this.topBottomDotSize + this.fontSize + 2;
    }
    private get titleMaxWidth() {
        return this.width - (this.barcodeSpacingFromRight + (this.barcode.length * this.barcodeWidth) + (this.barcodeWidth * 3) + this.textSpacingFromLeft + this.fontSize);
    }

    private get reasonSpacingFromTop() {
        this.ctx.font = this.getFont;
        const metrics = this.ctx.measureText(this.reason);
        return this.topSeparatorSpacingFromTop + (this.fontSize / 2) + (metrics.actualBoundingBoxAscent) + 2;
    }
    private get reasonMaxWidth() {
        return this.width - (this.textSpacingFromLeft + this.sideDotsSpacingFromRight + this.sideDotSize);
    }
    private get reasonMaxHeight() {
        return this.height - (this.topSeparatorSpacingFromTop + this.bottomSeparatorSpacingFromBottom + this.fontSize);
    }

    private get penaltySpacingFromBottom() {
        return this.bottomSeparatorSpacingFromBottom - this.fontSize - 10;
    }
}
