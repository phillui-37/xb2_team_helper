import { Checkbox, FormControlLabel } from "@mui/material"

export declare type CommonPureCheckBoxProps<T extends any[]> = {
    readonly onChange: (t: Record<T[number], boolean>) => void
    readonly state: Record<T[number], boolean>
    readonly isHorizontal?: boolean
}

export default function CommonPureCheckBox<T extends any[]>(props: CommonPureCheckBoxProps<T>) {
    return <div className={`flex ${props.isHorizontal ? 'flex-row' : 'flex-col'} max-w-fit w-screen overflow-x-scroll scrollbar-auto`}>
        {Object.entries(props.state).map(([label, flag]) => <FormControlLabel
            control={<Checkbox
                checked={flag as boolean}
                onChange={event => {
                    props.onChange({...props.state, [label]: event.target.checked})
                }}
            />}
            label={label}
        />)}
    </div>
}