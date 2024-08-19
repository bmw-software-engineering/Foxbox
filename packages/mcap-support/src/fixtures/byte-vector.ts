// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

// automatically generated by the FlatBuffers compiler, do not modify
/* eslint-disable */
import * as flatbuffers from "flatbuffers";

export class ByteVector {
  bb: flatbuffers.ByteBuffer | null = null;
  bb_pos = 0;
  __init(i: number, bb: flatbuffers.ByteBuffer): ByteVector {
    this.bb_pos = i;
    this.bb = bb;
    return this;
  }

  static getRootAsByteVector(bb: flatbuffers.ByteBuffer, obj?: ByteVector): ByteVector {
    return (obj || new ByteVector()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
  }

  static getSizePrefixedRootAsByteVector(bb: flatbuffers.ByteBuffer, obj?: ByteVector): ByteVector {
    bb.setPosition(bb.position() + flatbuffers.SIZE_PREFIX_LENGTH);
    return (obj || new ByteVector()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
  }

  data(index: number): number | null {
    const offset = this.bb!.__offset(this.bb_pos, 4);
    return offset ? this.bb!.readUint8(this.bb!.__vector(this.bb_pos + offset) + index) : 0;
  }

  dataLength(): number {
    const offset = this.bb!.__offset(this.bb_pos, 4);
    return offset ? this.bb!.__vector_len(this.bb_pos + offset) : 0;
  }

  dataArray(): Uint8Array | null {
    const offset = this.bb!.__offset(this.bb_pos, 4);
    return offset
      ? new Uint8Array(
          this.bb!.bytes().buffer,
          this.bb!.bytes().byteOffset + this.bb!.__vector(this.bb_pos + offset),
          this.bb!.__vector_len(this.bb_pos + offset),
        )
      : null;
  }

  static startByteVector(builder: flatbuffers.Builder) {
    builder.startObject(1);
  }

  static addData(builder: flatbuffers.Builder, dataOffset: flatbuffers.Offset) {
    builder.addFieldOffset(0, dataOffset, 0);
  }

  static createDataVector(
    builder: flatbuffers.Builder,
    data: number[] | Uint8Array,
  ): flatbuffers.Offset {
    builder.startVector(1, data.length, 1);
    for (let i = data.length - 1; i >= 0; i--) {
      builder.addInt8(data[i]!);
    }
    return builder.endVector();
  }

  static startDataVector(builder: flatbuffers.Builder, numElems: number) {
    builder.startVector(1, numElems, 1);
  }

  static endByteVector(builder: flatbuffers.Builder): flatbuffers.Offset {
    const offset = builder.endObject();
    return offset;
  }

  static finishByteVectorBuffer(builder: flatbuffers.Builder, offset: flatbuffers.Offset) {
    builder.finish(offset);
  }

  static finishSizePrefixedByteVectorBuffer(
    builder: flatbuffers.Builder,
    offset: flatbuffers.Offset,
  ) {
    builder.finish(offset, undefined, true);
  }

  static createByteVector(
    builder: flatbuffers.Builder,
    dataOffset: flatbuffers.Offset,
  ): flatbuffers.Offset {
    ByteVector.startByteVector(builder);
    ByteVector.addData(builder, dataOffset);
    return ByteVector.endByteVector(builder);
  }
}
