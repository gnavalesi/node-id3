const fs = require('fs');
const iconv = require('iconv-lite');

fs.readFile('02 Imagine.mp3', (err, data) => {
	if (err) {
		throw err;
	}

	const id3Buffer = findID3Buffer(data);

	console.log(parseID3Buffer(id3Buffer));
});

function findID3Buffer(buffer) {
	const id3BufferPosition = buffer.indexOf('ID3');

	if (id3BufferPosition < 0) {
		throw new Error('No ID3 tag found');
	}

	return buffer.slice(id3BufferPosition);
}

var id3Size = function (buffer) {
	// ID3 size integers are 28 bits
	return ((buffer[0] & 0b01111111) << 21 ) |
		((buffer[1] & 0b01111111) << 14) |
		((buffer[2] & 0b01111111) << 7) |
		(buffer[3] & 0b01111111);
};

var encoding = function (b) {
	switch (b) {
		case 0:
			return 'iso-8859-1';
		case 1:
			return 'utf-16';
		case 2:
			return 'utf-16be';
		case 3:
			return 'utf-8';
		default:
			throw new Error('Unknown encoding');
	}
};

function parseID3Buffer(buffer) {
	const result = {};

	result.header = parseID3Header(buffer);

	let index = 10;
	if (result.header.flags.extendedHeader) {
		result.extendedHeader = {};
		result.extendedHeader.size = id3Size(buffer.slice(index, 14));
		result.extendedHeader.numberOfFlagBytes = buffer.readUInt8(14);
		result.extendedHeader.extendedFlags = [];

		index = 15;
		for (let i = 0; i < result.extendedHeader.numberOfFlagBytes; i++, index++) {
			result.extendedHeader.extendedFlags[i] = {
				// TODO
			};
		}

		// TODO
	}

	const framesBufferSize = result.header.size - (result.header.flags.footer ? 10 : 0) - (result.header.flags.extendedHeader ? result.extendedHeader.size : 0);
	result.frames = [];

	while (index < framesBufferSize) {
		const frame = {};
		frame.header = {};
		frame.header.frameId = buffer.slice(index, index + 4).toString();
		frame.header.size = id3Size(buffer.slice(index + 4, index + 8));

		const flags = buffer.readUInt16BE(index + 8);
		frame.header.flags = {
			// TODO
		};

		index += 10;

		if (frame.header.frameId === 'UFID') {
			// 4.1. Unique file identifier
			frame.ownerIdentifier = iconv.decode(buffer.slice(index, index + 1));
			frame.identifier = Buffer.alloc(frame.header.size - 1);
			buffer.slice(index + 1, index + frame.header.size).copy(frame.identifier);
		} else if (frame.header.frameId === 'TXXX') {
			// 4.2.6. User defined text information frame
			frame.header.encoding = encoding(buffer.readUInt8(index));

			const content = iconv.decode(buffer.slice(index + 1, index + frame.header.size), frame.header.encoding).split('\u0000');
			frame.description = content[0];
			frame.information = content[1];
		} else if (frame.header.frameId.match(/^T[0-9a-z]{3}$/i)) {
			// 4.2. Text information frames
			frame.header.encoding = encoding(buffer.readUInt8(index));
			frame.information = iconv.decode(buffer.slice(index + 1, index + frame.header.size), frame.header.encoding);
		} else if (frame.header.frameId === 'WXXX') {
			// 4.3.2. User defined URL link frame
			frame.header.encoding = encoding(buffer.readUInt8(index));

			const content = iconv.decode(buffer.slice(index + 1, index + frame.header.size), frame.header.encoding).split('\u0000');
			frame.description = content[0];
			frame.url = content[1];
		} else if (frame.header.frameId.match(/^W[0-9a-z]{3}$/i)) {
			// 4.3. URL link frames
			frame.url = iconv.decode(buffer.slice(index, index + frame.header.size));
		} else if (frame.header.frameId === 'MCDI') {
			// 4.4. Music CD identifier
			frame.cdTOC = Buffer.alloc(frame.header.size);
			buffer.slice(index, index + frame.header.size).copy(frame.cdTOC);
		} else if (frame.header.frameId === 'ETCO') {
			// TODO: 4.5. Event timing codes
		} else if (frame.header.frameId === 'MLLT') {
			// TODO: 4.6. MPEG location lookup table
		} else if ('SYTC') {
			// TODO: 4.7. Synchronised tempo codes
		} else if ('USLT') {
			// TODO: 4.8. Unsynchronised lyrics/text transcription
		} else if ('SYLT') {
			// TODO: 4.9. Synchronised lyrics/text
		} else if ('COMM') {
			// TODO: 4.10. Comments
		} else if ('RVA2') {
			// TODO: 4.11. Relative volume adjustment (2)
		} else if ('EQU2') {
			// TODO: 4.12. Equalisation (2)
		} else if ('RVRB') {
			// TODO: 4.13. Reverb
		} else if ('APIC') {
			// TODO: 4.14. Attached picture
		} else if ('GEOB') {
			// TODO: 4.15. General encapsulated object
		} else if ('PCNT') {
			// TODO: 4.16. Play counter
		} else if ('POPM') {
			// TODO: 4.17. Popularimeter
		} else if ('RBUF') {
			// TODO: 4.18. Recommended buffer size
		} else if ('AENC') {
			// TODO: 4.19. Audio encryption
		} else if ('LINK') {
			// TODO: 4.20. Linked information
		} else if ('POSS') {
			// TODO: 4.21. Position synchronisation frame
		} else if ('USER') {
			// TODO: 4.22. Terms of use frame
		} else if ('OWNE') {
			// TODO: 4.23. Ownership frame
		} else if ('COMR') {
			// TODO: 4.24. Commercial frame
		} else if ('ENCR') {
			// TODO: 4.25. Encryption method registration
		} else if ('GRID') {
			// TODO: 4.26. Group identification registration
		} else if ('PRIV') {
			// TODO: 4.27. Private frame
		} else if ('SIGN') {
			// TODO: 4.28. Signature frame
		} else if ('SEEK') {
			// TODO: 4.29. Seek frame
		} else if ('ASPI') {
			// TODO: 4.30. Audio seek point index
		} else {

		}

		result.frames.push(frame);

		index += frame.header.size;
	}

	result.padding = 0; // TODO
	result.footer = {
		// TODO
	};

	return result;
}

function parseID3Header(buffer) {
	const result = {};

	result.majorVersion = buffer.readUInt8(3);
	result.revision = buffer.readUInt8(4);

	const FLAGS = buffer.readUInt8(5);

	result.flags = {};
	result.flags.unsynchronisation = !!((FLAGS & 0b10000000) >> 7);
	result.flags.extendedHeader = !!((FLAGS & 0b01000000) >> 6);
	result.flags.experimental = !!((FLAGS & 0b00100000) >> 5);
	result.flags.footer = !!((FLAGS & 0b00010000) >> 4);

	result.size = id3Size(buffer.slice(6, 10));

	return result;
}