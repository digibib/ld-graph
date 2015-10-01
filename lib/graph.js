(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], function () {
      return (root.graph = factory());
    });
  } else if (typeof module === 'object' && module.exports) {

    module.exports = factory();
  } else {
    root.graph = factory();
  }
}(this, function () {
  'use strict';

  var resolve = function(uri, graph) {
    var i = uri.indexOf(":");
    var prefix = uri.substr(0, i);
    if (graph.context[prefix]) {
      return graph.context[prefix] + uri.substr(i + 1);
    }

    // not in context, return unmodified (or throw error?)
    return uri;
  };

  var shortForm = function(s) {
    return s.substr(s.indexOf(":")+1);
  };

  var Node = function(id, graph) {
    this.id = id;
    this.graph = graph;
  };

  var parseProperty = function(v) {
    if (typeof(v) === "string") {
      return {value: v};
    } else if (Array.isArray(v)) {
      // TODO
    } else {
      if (v["@language"]) {
        return {value: v["@value"], lang: v["@language"]};
      } else if (v["@type"]) {
        return {value: v["@value"], type: v["@type"]};
      } else {
        throw new Error("cannot parse property: " + v);
      }

    }
    return res;
  }

  Node.prototype.get = function(property) {
    if (this.graph.nodes[this.id][property]) {
      var prop = this.graph.nodes[this.id][property][0];
      if ( prop.lang) {
        return {
          value: prop.value,
          lang: prop.lang,
          type: "http://www.w3.org/2000/01/rdf-schema#langString"
        };
      }
      return {
        value: prop.value,
        lang: prop.lang,
        type: this.graph.types[property]
      };
    }
    throw new Error("property not defined for resource: " + property);
  };

  var Graph = function(jsonld) {
    this.nodes = {};
    this.types = {};
    this.context = {};

    if (typeof(jsonld["@context"]) == "string") {
      this.context[""] = jsonld["@context"];
    } else {
      this.context = jsonld["@context"];
    }

    if (!jsonld["@graph"]) {
      // single-node graph
      var res = {};
      for (var prop in jsonld) {
        switch (prop) {
          case "@id":
          case "@type":
          case "@context":
            break;
          default:
            var v = parseProperty(jsonld[prop]);
            if (v.type) {
              this.types[shortForm(prop)] = resolve(v.type, this);
            }
            res[shortForm(prop)] = [{value: v.value, lang: v.lang}];
        }
      }
      this.nodes[jsonld["@id"]] = res;
    } else {
      // multi-node graph
      for (var i=0; i < jsonld["@graph"].length; i++) {
        var node = jsonld["@graph"][i];
        var res = {};

        for (var prop in node) {

          switch (prop) {
            case "@id":
            case "@type":
            case "@context":
              break;
            default:
              var v = parseProperty(node[prop]);
              if (v.type) {
                this.types[shortForm(prop)] = resolve(v.type, this);
              }
              res[shortForm(prop)] = [{value: v.value, lang: v.lang}];
          }
        }

        this.nodes[node["@id"]] = res;
      }
    }
  }

  Graph.prototype.byId = function(id) {
    if (this.nodes[id]) {
      return new Node(id, this);
    }
    throw new Error("resource not in graph: " + id);
  };

  Graph.prototype.all = function() {
    var res = [];
    for (var node in this.nodes) {
      res.push(new Node(node, this));
    }
    return res;
  };

  return {
    parse: function (jsonld) {
      return new Graph(jsonld);
    }
  };
}));
