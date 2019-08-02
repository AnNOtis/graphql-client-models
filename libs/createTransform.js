const META_FIELD_NAME = "__xxx__"
const DIFF_KEY = {
  same: "= same",
  changed: "* changed",
  added: "+ added"
}

function pipe({ funcs, value, self, root }) {
  return funcs.reduce(function(acc, func) {
    return func(acc, self, {
      root
    })
  }, value)
}

function isObject(value) {
  return value !== null && typeof value === "object"
}

function isCustomClass(value) {
  return isObject(value) && (value.constructor && value.constructor !== Object)
}

function isFunction(value) {
  return typeof value === "function"
}

// following types should be true:
// null, undefined, boolean, number, string, symbol
function isPrimitiveType(value) {
  return (
    value === null || (typeof value !== "object" && typeof value !== "function")
  )
}

function transformedResult({ getter, self, value, fieldName, original }) {
  if (Array.isArray(getter)) {
    return pipe({
      funcs: getter,
      value,
      self,
      original
    })
  } else if (isFunction(getter)) {
    return getter(self, value, {
      original
    })
  }

  throw TypeError(
    `The transform function of field "${fieldName}" of type "${self.__typename}" should be type of array or function`
  )
}

function createDiffRecord(data, models, path) {
  return {
    [DIFF_KEY.same]: {},
    [DIFF_KEY.changed]: {},
    [DIFF_KEY.added]: {},
    path,
    original: data,
    models
  }
}

function initProxy(rootData, models, configs) {
  let proxyRootData

  function assignGetters(data, path = []) {
    if (isPrimitiveType(data)) return data
    if (isFunction(data)) return data
    if (Array.isArray(data)) {
      return data.map(function(item, index) {
        return assignGetters(item, path.concat(index))
      })
    }
    if (isCustomClass(data)) {
      // dont know how to cloned a custom class, so bypass it
      return data
    }
    // the data object has been assigned getters
    if (data[META_FIELD_NAME]) return data

    const type = data.__typename
    const model = models[type] || {}
    const clonedData = Object.assign({}, data)
    const diffRecord = createDiffRecord(data, model, path)
    const cache = {}

    Object.entries(clonedData).forEach(function([key, value]) {
      const getter = model[key]
      if (key === "__typename") return

      if (getter === undefined) {
        diffRecord[DIFF_KEY.same][key] = true
      } else {
        diffRecord[DIFF_KEY.changed][key] = true
      }

      Object.defineProperty(clonedData, key, {
        get() {
          if (cache[key] !== undefined) {
            return cache[key]
          }
          const result =
            getter === undefined
              ? value
              : transformedResult({
                  getter,
                  self: clonedData,
                  value,
                  fieldName: key,
                  root: proxyRootData,
                  original: rootData
                })

          return (cache[key] = assignGetters(result, path.concat(key)))
        },
        enumerable: true
      })
    })

    Object.entries(model).forEach(function([key, getter]) {
      if (
        diffRecord[DIFF_KEY.changed].hasOwnProperty(key) ||
        getter === undefined
      ) {
        return
      }
      diffRecord[DIFF_KEY.added][key] = true

      Object.defineProperty(clonedData, key, {
        get() {
          if (cache[key] !== undefined) {
            return cache[key]
          }
          const result = transformedResult({
            getter,
            self: clonedData,
            value: undefined,
            fieldName: key,
            root: proxyRootData,
            original: rootData
          })

          return (cache[key] = assignGetters(result, path.concat(key)))
        },
        enumerable: true
      })
    })

    Object.defineProperty(clonedData, META_FIELD_NAME, {
      get() {
        return Object.assign({}, diffRecord, {
          [DIFF_KEY.same]: Object.keys(diffRecord[DIFF_KEY.same]),
          [DIFF_KEY.changed]: Object.keys(diffRecord[DIFF_KEY.changed]),
          [DIFF_KEY.added]: Object.keys(diffRecord[DIFF_KEY.added])
        })
      },
      enumerable: false
    })

    return clonedData
  }

  return (proxyRootData = assignGetters(rootData))
}

const createTransformFn = function(models, configs) {
  return function transform(data) {
    return initProxy(data, Object.freeze(models), configs)
  }
}

module.exports = createTransformFn
