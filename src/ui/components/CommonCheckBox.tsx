import { Checkbox, FormControlLabel } from "@mui/material"
import { useEffect, useState } from "react"

export declare type CommonCheckBoxProps<T extends any[]> = {
    readonly onChange: (t: Record<T[number], boolean>) => void
    readonly initialState: Record<T[number], boolean>
    readonly isHorizontal?: boolean
}

export default function CommonCheckBox<T extends any[]>(props: CommonCheckBoxProps<T>) {
    const [flags, setFlags] = useState(props.initialState)

    useEffect(() => {
        props.onChange(flags)
    }, [flags])

    return <div className={`flex ${props.isHorizontal ? 'flex-row' : 'flex-col'} overflow-x-scroll scrollbar-auto w-screen max-w-fit`}>
        {Object.entries(flags).map(([label, flag]) => <FormControlLabel
            control={<Checkbox
                checked={flag as boolean}
                onChange={event => {
                    setFlags(ori => ({...ori, [label]: event.target.checked}))
                }}
            />}
            label={label}
        />)}
    </div>
}