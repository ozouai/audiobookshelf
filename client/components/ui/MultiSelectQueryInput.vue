<template>
  <div class="w-full">
    <p class="px-1 text-sm font-semibold" :class="disabled ? 'text-gray-400' : ''">{{ label }}</p>
    <div ref="wrapper" class="relative">
      <form @submit.prevent="submitForm">
        <div ref="inputWrapper" style="min-height: 36px" class="flex-wrap relative w-full shadow-sm flex items-center border border-gray-600 rounded px-2 py-0.5" :class="wrapperClass" @click.stop.prevent="clickWrapper" @mouseup.stop.prevent @mousedown.prevent>
          <div v-for="item in selected" :key="item.id" class="rounded-full px-2 py-0.5 m-0.5 text-xs bg-bg flex flex-nowrap whitespace-nowrap items-center justify-center relative min-w-12">
            <div v-if="!disabled" class="w-full h-full rounded-full absolute top-0 left-0 opacity-0 hover:opacity-100 px-1 bg-bg bg-opacity-75 flex items-center justify-end cursor-pointer">
              <span v-if="showEdit" class="material-icons text-base text-white hover:text-warning mr-1" @click.stop="editItem(item)">edit</span>
              <span class="material-icons text-white hover:text-error" style="font-size: 1.1rem" @click.stop="removeItem(item.id)">close</span>
            </div>
            {{ item[textKey] }}
          </div>
          <div v-if="showEdit && !disabled" class="rounded-full cursor-pointer w-6 h-6 mx-0.5 bg-bg flex items-center justify-center">
            <span class="material-icons text-white hover:text-success pt-px pr-px" style="font-size: 1.1rem" @click.stop="addItem">add</span>
          </div>
          <input v-show="!readonly" ref="input" v-model="textInput" :disabled="disabled" style="min-width: 40px; width: 40px" class="h-full bg-primary focus:outline-none px-1" @keydown="keydownInput" @focus="inputFocus" @blur="inputBlur" />
        </div>
      </form>

      <ul ref="menu" v-show="showMenu" class="absolute z-60 w-full bg-bg border border-black-200 shadow-lg max-h-56 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm" role="listbox" aria-labelledby="listbox-label">
        <template v-for="item in itemsToShow">
          <li :key="item.id" class="text-gray-50 select-none relative py-2 pr-9 cursor-pointer hover:bg-black-400" role="option" @click="clickedOption($event, item)" @mouseup.stop.prevent @mousedown.prevent>
            <div class="flex items-center">
              <span class="font-normal ml-3 block truncate">{{ item.name }}</span>
            </div>
            <span v-if="getIsSelected(item.id)" class="text-yellow-400 absolute inset-y-0 right-0 flex items-center pr-4">
              <span class="material-icons text-xl">checkmark</span>
            </span>
          </li>
        </template>
        <li v-if="!itemsToShow.length" class="text-gray-50 select-none relative py-2 pr-9" role="option">
          <div class="flex items-center justify-center">
            <span class="font-normal">{{ $strings.MessageNoItems }}</span>
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>

<script>
export default {
  props: {
    value: {
      type: Array,
      default: () => []
    },
    filterKey: String,
    label: String,
    disabled: Boolean,
    readonly: Boolean,
    showEdit: Boolean,
    textKey: {
      type: String,
      default: 'name'
    }
  },
  data() {
    return {
      textInput: null,
      currentSearch: null,
      typingTimeout: null,
      isFocused: false,
      menu: null,
      items: []
    }
  },
  watch: {
    showMenu(newVal) {
      if (newVal) this.setListener()
      else this.removeListener()
    }
  },
  computed: {
    selected: {
      get() {
        return this.value || []
      },
      set(val) {
        this.$emit('input', val)
      }
    },
    userToken() {
      return this.$store.getters['user/getToken']
    },
    wrapperClass() {
      var classes = []
      if (this.disabled) classes.push('bg-black-300')
      else classes.push('bg-primary')
      if (!this.readonly) classes.push('cursor-text')
      return classes.join(' ')
    },
    showMenu() {
      return this.isFocused && this.currentSearch
    },
    itemsToShow() {
      return this.items
    },
    filterData() {
      return this.$store.state.libraries.filterData || {}
    }
  },
  methods: {
    addItem() {
      this.$emit('add')
    },
    editItem(item) {
      this.$emit('edit', item)
    },
    getIsSelected(itemValue) {
      return !!this.selected.find((i) => i.id === itemValue)
    },
    search() {
      this.currentSearch = this.textInput
      const dataToSearch = this.filterData[this.filterKey] || []

      const results = dataToSearch.filter((au) => {
        return au.name.toLowerCase().includes(this.currentSearch.toLowerCase().trim())
      })

      this.items = results || []
    },
    keydownInput() {
      clearTimeout(this.typingTimeout)
      this.typingTimeout = setTimeout(() => {
        this.search()
      }, 250)
      this.setInputWidth()
    },
    setInputWidth() {
      setTimeout(() => {
        var value = this.$refs.input.value
        var len = value.length * 7 + 24
        this.$refs.input.style.width = len + 'px'
        this.recalcMenuPos()
      }, 50)
    },
    recalcMenuPos() {
      if (!this.menu || !this.$refs.inputWrapper) return
      var boundingBox = this.$refs.inputWrapper.getBoundingClientRect()
      if (boundingBox.y > window.innerHeight - 8) {
        // Input is off the page
        return this.forceBlur()
      }
      var menuHeight = this.menu.clientHeight
      var top = boundingBox.y + boundingBox.height - 4
      if (top + menuHeight > window.innerHeight - 20) {
        // Reverse menu to open upwards
        top = boundingBox.y - menuHeight - 4
      }

      this.menu.style.top = top + 'px'
      this.menu.style.left = boundingBox.x + 'px'
      this.menu.style.width = boundingBox.width + 'px'
    },
    unmountMountMenu() {
      if (!this.$refs.menu || !this.$refs.inputWrapper) return
      this.menu = this.$refs.menu

      var boundingBox = this.$refs.inputWrapper.getBoundingClientRect()
      this.menu.remove()
      document.body.appendChild(this.menu)
      this.menu.style.top = boundingBox.y + boundingBox.height - 4 + 'px'
      this.menu.style.left = boundingBox.x + 'px'
      this.menu.style.width = boundingBox.width + 'px'
    },
    inputFocus() {
      if (!this.menu) {
        this.unmountMountMenu()
      }
      this.isFocused = true
      this.$nextTick(this.recalcMenuPos)
    },
    inputBlur() {
      if (!this.isFocused) return

      setTimeout(() => {
        if (document.activeElement === this.$refs.input) {
          return
        }
        this.isFocused = false
        if (this.textInput) this.submitForm()
      }, 50)
    },
    focus() {
      if (this.$refs.input) this.$refs.input.focus()
    },
    blur() {
      if (this.$refs.input) this.$refs.input.blur()
    },
    forceBlur() {
      this.isFocused = false
      if (this.textInput) this.submitForm()
      if (this.$refs.input) this.$refs.input.blur()
    },
    clickedOption(e, item) {
      if (e) {
        e.stopPropagation()
        e.preventDefault()
      }
      if (this.$refs.input) this.$refs.input.focus()

      let newSelected = null
      if (this.getIsSelected(item.id)) {
        newSelected = this.selected.filter((s) => s.id !== item.id)
        this.$emit('removedItem', item.id)
      } else {
        newSelected = this.selected.concat([
          {
            id: item.id,
            name: item.name
          }
        ])
      }
      this.textInput = null
      this.currentSearch = null

      this.$emit('input', newSelected)
      this.$nextTick(() => {
        this.recalcMenuPos()
      })
    },
    clickWrapper() {
      if (this.disabled) return
      if (this.showMenu) {
        return this.blur()
      }
      this.focus()
    },
    removeItem(itemId) {
      var remaining = this.selected.filter((i) => i.id !== itemId)
      this.$emit('input', remaining)
      this.$emit('removedItem', itemId)
      this.$nextTick(() => {
        this.recalcMenuPos()
      })
    },
    insertNewItem(item) {
      this.selected.push(item)
      this.$emit('input', this.selected)
      this.$emit('newItem', item)
      this.textInput = null
      this.currentSearch = null
      this.$nextTick(() => {
        this.blur()
      })
    },
    submitForm() {
      if (!this.textInput) return

      const cleaned = this.textInput.trim()
      const matchesItem = this.items.find((i) => {
        return i.name === cleaned
      })

      if (matchesItem) {
        this.clickedOption(null, matchesItem)
      } else {
        this.insertNewItem({
          id: `new-${Date.now()}`,
          name: this.textInput
        })
      }
    },
    scroll() {
      this.recalcMenuPos()
    },
    setListener() {
      document.addEventListener('scroll', this.scroll, true)
    },
    removeListener() {
      document.removeEventListener('scroll', this.scroll, true)
    }
  },
  mounted() {},
  beforeDestroy() {
    if (this.menu) this.menu.remove()
  }
}
</script>

<style scoped>
input {
  border-style: inherit !important;
}
input:read-only {
  color: #aaa;
  background-color: #444;
}
</style>