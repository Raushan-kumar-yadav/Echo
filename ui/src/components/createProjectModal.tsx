import React, {useState} from "react";
import './createProjectModal.css'


interface creatModalParam{
    onClose : () => void;
    onProjectCreated :() => void;
}


const SEP = navigator.platform.startsWith('win') ? '\\' :'/';


export default function createProjectModal({onClose , onProjectCreated} : creatModalParam){

    const [name, setName] = useState("Untitled Project");
    const [width, setWidth] = useState(1920);
    const [height, setHeight] = useState(1080);
    const [fps, setFps] = useState(30.0);
    const [totalFrame, setTotalFrame] = useState(1800);
    const [projectFolder, setProjectFolder] = useState('');
    const [folderError, setFolderError] = useState('');
    const [loading, setLoading] = useState(false);


    const safeFileName = (n:string) =>n.replace(/[<>:"/\\|?*]/g, '_').trim() || 'Untitled Project';

    const previewPath = projectFolder
        ? `${projectFolder}${SEP}${safeFileName(name)}.fade`
        : '';


    const pickFolder = async ()=>{
        const el = (window as any).electronAPI;
        const fp :string | undefined = await el.showOpenDialog({title:'select project folder ' ,  properties: ['openDirectory', 'createDirectory'],})

        if(fp){
            setProjectFolder(fp);
            console.log(fp); 
            setFolderError('');
        }
        console.log("nothing ");
        
    }

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <h2>Create New Project</h2>
                
                <div className="form-group">
                    <label>Project Name:</label>
                    <input 
                        type="text" 
                        value={name} 
                        onChange={(e) => setName(e.target.value)} 
                    />
                </div>

                <div className="form-group">
                    <label>Project Folder:</label>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <input type="text" readOnly value={projectFolder} placeholder="No folder selected" />
                        <button onClick={pickFolder}>Browse</button>
                    </div>
                    {folderError && <span style={{ color: 'red' }}>{folderError}</span>}
                </div>

                <div className="modal-actions" style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                    <button onClick={onClose}>Cancel</button>
                    <button 
                        onClick={onProjectCreated} 
                        disabled={!projectFolder || loading}
                    >
                        Create Project
                    </button>
                </div>
            </div>
        </div>
    );
}