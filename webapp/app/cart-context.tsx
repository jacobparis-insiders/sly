import type { ReactNode } from "react"
import { createContext, useContext, useReducer } from "react"

type CartItem = {
  library: string
  component: string
}

type CartState = {
  items: CartItem[]
}

type CartAction =
  | { type: "ADD_ITEM"; payload: CartItem }
  | { type: "REMOVE_ITEM"; payload: CartItem }
  | { type: "CLEAR_CART" }

type CartContextType = {
  state: CartState
  addToCart: (item: CartItem) => void
  removeFromCart: (item: CartItem) => void
  clearCart: () => void
  isInCart: (item: CartItem) => boolean
}

const CartContext = createContext<CartContextType | undefined>(undefined)

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "ADD_ITEM":
      if (
        state.items.some(
          (item) =>
            item.library === action.payload.library &&
            item.component === action.payload.component,
        )
      ) {
        return state
      }
      return { ...state, items: [...state.items, action.payload] }

    case "REMOVE_ITEM":
      return {
        ...state,
        items: state.items.filter(
          (item) =>
            !(
              item.library === action.payload.library &&
              item.component === action.payload.component
            ),
        ),
      }

    case "CLEAR_CART":
      return { ...state, items: [] }

    default:
      return state
  }
}

export function CartProvider({
  children,
  name,
}: {
  children: ReactNode
  name: "component" | "icon"
}) {
  const [state, dispatch] = useReducer(cartReducer, { items: [] })

  const addToCart = (item: CartItem) => {
    dispatch({ type: "ADD_ITEM", payload: item })
  }

  const removeFromCart = (item: CartItem) => {
    dispatch({ type: "REMOVE_ITEM", payload: item })
  }

  const clearCart = () => {
    dispatch({ type: "CLEAR_CART" })
  }

  const isInCart = (item: CartItem) => {
    return state.items.some(
      (cartItem) =>
        cartItem.library === item.library &&
        cartItem.component === item.component,
    )
  }

  return (
    <CartContext.Provider
      value={{ state, addToCart, removeFromCart, clearCart, isInCart }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart(name: "component" | "icon") {
  const context = useContext(CartContext)
  if (context === undefined) {
    throw new Error(
      `useCart must be used within a CartProvider with name="${name}"`,
    )
  }
  return context
}
