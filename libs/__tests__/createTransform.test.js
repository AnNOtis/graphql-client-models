const createTransform = require("../createTransform")

describe("#createTransform", () => {
  test("return a transform function", () => {
    const models = {}
    const transform = createTransform(models)
    expect(typeof transform).toBe("function")
  })
})

function createModels() {
  return {
    SomeModel: {
      changedField: jest.fn(() => "changed"),
      newField: jest.fn(() => "new")
    }
  }
}

describe("Model is assigned getters when there are corresponding type", () => {
  let models
  let transform
  beforeEach(() => {
    models = createModels()
    transform = createTransform(models)
  })

  test("data is targeted by __xxx___", () => {
    const data = {
      __typename: "SomeModel"
    }

    const result = transform(data)

    expect(result.__xxx__).toBeDefined()
  })

  test("result.__xxx__ shows debug info", () => {
    const data = {
      changedField: "foo",
      sameField: "same",
      __typename: "SomeModel"
    }
    const result = transform(data)
    const debugInfo = result.__xxx__
    expect(debugInfo["= same"]).toEqual(["sameField"])
    expect(debugInfo["* changed"]).toEqual(["changedField"])
    expect(debugInfo["+ added"]).toEqual(["newField"])
    expect(debugInfo.path).toEqual([])
    expect(debugInfo.original).toBe(data)
    expect(debugInfo.models).toBe(models.SomeModel)
  })

  describe("when the corresponding getter exists", () => {
    test("the getter is called", () => {
      const data = {
        changedField: "foo",
        __typename: "SomeModel"
      }
      const result = transform(data)

      result.changedField
      expect(models.SomeModel.changedField).toBeCalledTimes(1)
      expect(models.SomeModel.changedField).toBeCalledWith(
        expect.objectContaining({
          changedField: "changed",
          newField: "new",
          __typename: "SomeModel"
        }),
        data.changedField,
        expect.objectContaining({
          original: data
        })
      )
    })

    test("exist field returns getters value ", () => {
      const data = {
        changedField: "foo",
        __typename: "SomeModel"
      }
      const result = transform(data)

      expect(result.changedField).toBe("changed")
    })

    test("undefined field returns getters value", () => {
      const data = {
        __typename: "SomeModel"
      }
      const result = transform(data)
      expect(result.newField).toBe("new")
    })
  })

  test("model is transformed when it's in a nested object", () => {
    const data = {
      a: {
        b: {
          c: {
            changedField: "foo",
            sameField: "same",
            __typename: "SomeModel"
          }
        }
      },
      __typename: "SomeModel"
    }
    const result = transform(data)

    expect(result.a.b.c.changedField).toBe("changed")
    expect(result.a.b.c.newField).toBe("new")
    expect(result.a.b.c.sameField).toBe("same")
  })

  test("model is transformed when it's nested in an array", () => {
    const data = {
      a: [
        {
          changedField: "foo",
          sameField: "same",
          __typename: "SomeModel"
        }
      ],
      __typename: "SomeModel"
    }
    const result = transform(data)

    expect(result.a[0].changedField).toBe("changed")
    expect(result.a[0].newField).toBe("new")
    expect(result.a[0].sameField).toBe("same")
  })

  test("Object.assign should work", () => {
    const data = {
      a: {
        b: {
          c: {
            changedField: "foo",
            sameField: "same",
            __typename: "SomeModel"
          }
        }
      },
      __typename: "SomeModel"
    }
    const result = transform(data)
    const combinedObject = Object.assign(
      {
        foo: "bar"
      },
      result.a.b.c
    )

    expect(combinedObject.changedField).toBe("changed")
    expect(combinedObject.newField).toBe("new")
    expect(combinedObject.sameField).toBe("same")
  })

  test("result is enumerable", () => {
    const data = {
      a: [
        {
          changedField: "foo",
          sameField: "same",
          __typename: "SomeModel"
        },
        {
          changedField: "foo",
          sameField: "same",
          __typename: "SomeModel"
        }
      ]
    }
    const result = transform(data)

    result.a.forEach(model => {
      expect(model.changedField).toBe("changed")
      expect(model.newField).toBe("new")
      expect(model.sameField).toBe("same")
    })
  })
})
