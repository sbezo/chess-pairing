/* brx 2025
 */

"use strict";

import { base64ArrayBuffer } from "./base64ArrayBuffer.js";
import { Base64Binary } from "./Base64Binary.js";
import { BitStream } from "./BitStream.js";

// uses TextEncoder, TextDecoder

export class DullSerializer {
	/*
	 * Data serializer/deserializer for specific purposes.
	 * Serialized data does NOT contain self-describing info.
	 */

	 utf8ToByteArray(text) {
		return new TextEncoder().encode(text)
	}

	 byteArrayToUtf8(bytes) {
		 // some restrictions are on decode arg1 type, so converting
		 // to UInt8Array
		return new TextDecoder().decode(new Uint8Array(bytes))
	}

	 int_array_to_bitstream(bit_size, arr) {
		let bs =  new BitStream()
		bs.write_int_array(bit_size, arr)
		bs.lock()
		return bs.get_stream_data()
	}

	 readInt16(arr, idx_obj) {
		let idx = idx_obj.val
		let res = arr[idx] + arr[idx+1]*256
		idx_obj.val += 2
		return res
	}

	 readInt8(arr, idx_obj) {
		let idx = idx_obj.val
		let res = arr[idx]
		idx_obj.val++
		return res
	}

	 readBytes(arr, idx_obj, size) {
		let idx = idx_obj.val
		let res = new Uint8Array(arr.slice(idx, idx+size))
		idx_obj.val += size
		return res
	}

	readString8(arr, idx_obj) {
		let size = this.readInt8(arr, idx_obj)
		if (!size) return ""
		return this.byteArrayToUtf8(this.readBytes(arr, idx_obj, size))
	}

	 appendInt8(arr, val) {
		arr.push(val%256)
	}

	 appendInt16(arr, val) {
		arr.push(val%256)
		arr.push(Math.floor(val/256))
	}

	appendString8(arr, val) {
		let enc = this.utf8ToByteArray(val)
		this.appendInt8(arr, enc.length)
		if (!enc.length) return
		arr.push(...enc)
	}

	 serialize_bitstream(arr, bitstream) {
		this.appendInt16(arr, bitstream.bit_length)
		this.appendInt16(arr, bitstream.n_values)
		arr.push(...bitstream.bytes)
	}

	 deserialize_bitstream(arr, idx, item_bitsize) {
		/* when bitstream contains only same item_bitsize */
		let bit_length = this.readInt16(arr, idx)
		let n_values = this.readInt16(arr, idx)

		let bitstream_len = Math.ceil(bit_length/8)
		let bitstream_bytes = arr.slice(idx.val, idx.val+bitstream_len)

		let bs = new BitStream()
		bs.set_stream_data({ 
			'bit_length': bit_length, 
			'bytes' : bitstream_bytes, 
			'n_values': n_values
		})
		
		let values = new Array()
		bs.lock()
		for (let i=0; i< n_values; i++) {
			values.push(bs.read(item_bitsize))
		}

		idx.val += bitstream_bytes

		return values
	}
}
