'use strict';

var through2 = require('through2'),
  types = require('ast-types');

/**
 * Create a transform stream that attempts to infer a `name` tag from the context,
 * and adopt `@class` and other other tags as implied name tags.
 *
 * @name inferName
 * @return {stream.Transform}
 */
module.exports = function inferName() {
  return through2.obj(function (comment, enc, callback) {
    // If this comment is already explicitly named, simply pass it
    // through the stream without doing any inference.
    if (comment.name) {
      return callback(null, comment);
    }

    if (comment.event) {
      comment.name = comment.event;
      return callback(null, comment);
    }

    if (comment.callback) {
      comment.name = comment.callback;
      return callback(null, comment);
    }

    if (comment.class && comment.class.name) {
      comment.name = comment.class.name;
      return callback(null, comment);
    }

    if (comment.typedef) {
      comment.name = comment.typedef.name;
      return callback(null, comment);
    }

    // The strategy here is to do a depth-first traversal of the AST,
    // looking for nodes with a "name" property, with exceptions as needed.
    // For example, name inference for a MemberExpression `foo.bar = baz` will
    // infer the named based on the `property` of the MemberExpression (`bar`)
    // rather than the `object` (`foo`).
    types.visit(comment.context.ast, {
      inferName: function (path, value) {
        if (value && value.name) {
          comment.name = value.name;
          this.abort();
        } else {
          this.traverse(path);
        }
      },

      visitNode: function (path) {
        this.inferName(path, path.value);
      },

      visitMemberExpression: function (path) {
        this.inferName(path, path.value.property);
      }
    });

    callback(null, comment);
  });
};
